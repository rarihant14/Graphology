"""
auth/dependencies.py — FastAPI dependencies for route protection.

Provides reusable dependency functions that can be injected into any
FastAPI route to enforce authentication and authorization.

Primary export:
  get_current_user — validates a Bearer JWT token and returns the
                     corresponding User ORM instance from the database.

Usage in a protected route:
    from auth.dependencies import get_current_user
    from database import User

    @app.get("/protected")
    def protected_route(current_user: User = Depends(get_current_user)):
        return {"message": f"Hello, {current_user.name}"}

Any route that declares get_current_user as a dependency will automatically:
  1. Require an Authorization: Bearer <token> header
  2. Validate the JWT signature and expiry
  3. Confirm the user still exists in the database
  4. Return HTTP 401 with a clear message if any step fails
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.utils import decode_access_token
from database import User, get_db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OAuth2 scheme — tells FastAPI where to extract the Bearer token from.
#
# tokenUrl is set to "/auth/token" as a placeholder (we use OAuth not
# password flow) but it is required by the OAuth2PasswordBearer constructor.
# The actual token extraction from the Authorization header works regardless.
#
# auto_error=False means FastAPI will pass None instead of raising a 401
# automatically — we handle the 401 ourselves below with a clearer message.
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    auto_error=False,   # We raise our own 401 with a descriptive message
)

# ---------------------------------------------------------------------------
# Reusable 401 exception — defined once so the message is consistent
# everywhere it's raised.
# ---------------------------------------------------------------------------

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Authentication required. Please log in to access this resource.",
    headers={"WWW-Authenticate": "Bearer"},
)

_EXPIRED_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Your session has expired. Please log in again.",
    headers={"WWW-Authenticate": "Bearer"},
)

_USER_NOT_FOUND_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="User account not found. Please log in again.",
    headers={"WWW-Authenticate": "Bearer"},
)


# ---------------------------------------------------------------------------
# Primary dependency — get_current_user
# ---------------------------------------------------------------------------

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that validates a JWT Bearer token and returns the
    corresponding authenticated User from the database.

    This function is designed to be used as a FastAPI dependency via
    Depends(get_current_user). It performs three checks in order:

      1. Token presence  — rejects requests with no Authorization header
      2. Token validity  — verifies JWT signature, expiry, and structure
      3. User existence  — confirms the user still exists in the database
                           (catches cases where a user was deleted after
                           their token was issued)

    Args:
        token:  JWT string extracted from the Authorization: Bearer header
                by FastAPI's OAuth2PasswordBearer scheme. None if the
                header is missing.
        db:     SQLAlchemy database session injected by get_db().

    Returns:
        The authenticated User ORM instance if all checks pass.

    Raises:
        HTTPException 401: If the token is missing, invalid, expired,
                           or the user no longer exists in the database.

    Example:
        @app.post("/analyze")
        async def analyze(
            file: UploadFile = File(...),
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db),
        ):
            # current_user is guaranteed to be a valid User at this point
            return {"user": current_user.name}
    """

    # -- Step 1: Check token presence --
    # If no Authorization header was sent, token will be None
    if not token:
        logger.warning("Request rejected — no Authorization header present.")
        raise _CREDENTIALS_EXCEPTION

    # -- Step 2: Decode and verify the JWT --
    # decode_access_token returns None for any invalid/expired token
    payload = decode_access_token(token)

    if payload is None:
        # We can't distinguish expired vs invalid here since decode_access_token
        # returns None for both — log and raise a generic 401.
        # If you need to distinguish them, modify decode_access_token to raise
        # typed exceptions instead of returning None.
        logger.warning("Request rejected — JWT token is invalid or expired.")
        raise _CREDENTIALS_EXCEPTION

    # -- Step 3: Extract user ID from the "sub" claim --
    # "sub" (subject) is the standard JWT claim for the user identifier.
    # We store the user's DB primary key here as a string (JWT spec requires
    # "sub" to be a string even for integer IDs).
    user_id_str: Optional[str] = payload.get("sub")

    if not user_id_str:
        logger.warning(
            "Request rejected — JWT payload missing 'sub' claim. Payload keys: %s",
            list(payload.keys()),
        )
        raise _CREDENTIALS_EXCEPTION

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.warning(
            "Request rejected — 'sub' claim is not a valid integer: %r", user_id_str
        )
        raise _CREDENTIALS_EXCEPTION

    # -- Step 4: Look up the user in the database --
    # This step is important: it catches the edge case where a valid token
    # exists for a user who has since been deleted from the database.
    try:
        user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    except Exception as exc:
        logger.error(
            "Database error while looking up user_id=%d: %s", user_id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while verifying your session. Please try again.",
        ) from exc

    if user is None:
        logger.warning(
            "Request rejected — no user found in DB for user_id=%d (token was valid).",
            user_id,
        )
        raise _USER_NOT_FOUND_EXCEPTION

    logger.debug(
        "Authentication successful — user_id=%d email=%s.", user.id, user.email
    )
    return user


# ---------------------------------------------------------------------------
# Optional dependency — get_current_user_or_none
# ---------------------------------------------------------------------------

def get_current_user_or_none(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    A softer variant of get_current_user that returns None instead of
    raising HTTP 401 when the user is not authenticated.

    Useful for endpoints that have different behaviour for authenticated
    vs anonymous users (e.g. a public page that shows extra info when
    logged in) without fully blocking unauthenticated access.

    Args:
        token:  JWT string or None.
        db:     SQLAlchemy database session.

    Returns:
        Authenticated User instance, or None if not authenticated.

    Example:
        @app.get("/public")
        def public_route(
            current_user: Optional[User] = Depends(get_current_user_or_none)
        ):
            if current_user:
                return {"message": f"Hello, {current_user.name}"}
            return {"message": "Hello, guest"}
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return None

    try:
        return db.query(User).filter(User.id == user_id).first()
    except Exception as exc:
        logger.error("DB error in get_current_user_or_none: %s", exc)
        return None