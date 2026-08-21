"""
auth/utils.py — JWT token management for the Graphology AI Agent.

Handles creation and verification of signed JWT access tokens used to
authenticate users on all protected API endpoints.

Flow:
  1. User completes OAuth → auth/router.py calls create_access_token()
  2. Token is sent to the React frontend via redirect URL query param
  3. Frontend stores token in memory and sends it as Authorization: Bearer
  4. Protected routes call decode_access_token() via the get_current_user dependency

Environment variables (all loaded from .env):
  JWT_SECRET_KEY      — long random string used to sign tokens (required)
  JWT_ALGORITHM       — signing algorithm, default "HS256"
  JWT_EXPIRE_MINUTES  — token lifetime in minutes, default 1440 (24 hours)
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from jose import ExpiredSignatureError, JWTError, jwt

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration — loaded from environment / .env file
# ---------------------------------------------------------------------------

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours

# Fail fast at import time if the secret key is missing or too short.
# A weak or missing secret key compromises ALL issued tokens.
if not JWT_SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY is not set. "
        "Add a long random string to your .env file:\n"
        "  JWT_SECRET_KEY=your_very_long_random_secret_here\n"
        "You can generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

if len(JWT_SECRET_KEY) < 32:
    raise ValueError(
        f"JWT_SECRET_KEY is too short ({len(JWT_SECRET_KEY)} chars). "
        "Use at least 32 characters for adequate security."
    )

logger.info(
    "JWT config loaded — algorithm: %s, expiry: %d minutes.",
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
)


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def create_access_token(data: dict) -> str:
    """
    Create a signed JWT access token containing the provided payload data.

    The token payload is a copy of `data` with an `exp` (expiry) claim added.
    The expiry is calculated from the current UTC time plus JWT_EXPIRE_MINUTES.

    Args:
        data: Dictionary of claims to embed in the token. Should always
              include at minimum {"sub": str(user_id)} so the user can be
              identified when the token is decoded later.

              Example:
                  {
                      "sub": "42",          # user's DB primary key as string
                      "email": "a@b.com",   # optional extra claims
                  }

    Returns:
        A signed JWT string, e.g.:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImV4cCI6..."

    Raises:
        RuntimeError: If token encoding fails for any unexpected reason.
    """
    # Copy the payload to avoid mutating the caller's dict
    payload = data.copy()

    # Calculate the expiry timestamp in UTC
    expire_at = datetime.now(tz=timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)

    # "exp" is a registered JWT claim — python-jose uses it automatically
    # during decoding to reject expired tokens
    payload["exp"] = expire_at

    # "iat" (issued at) is optional but useful for debugging and auditing
    payload["iat"] = datetime.now(tz=timezone.utc)

    try:
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        logger.debug("Access token created for sub=%s, expires=%s.", payload.get("sub"), expire_at)
        return token
    except Exception as exc:
        logger.error("Failed to encode JWT token: %s", exc)
        raise RuntimeError(f"Token creation failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Token decoding / verification
# ---------------------------------------------------------------------------

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.

    Verifies the token's signature using JWT_SECRET_KEY and checks that
    it has not expired. Returns the decoded payload as a dict on success,
    or None if the token is invalid for any reason.

    This function intentionally swallows all JWT errors and returns None
    rather than raising — the caller (get_current_user dependency) is
    responsible for raising the appropriate HTTP 401 response.

    Args:
        token: The raw JWT string received from the Authorization header,
               e.g. the value of "Bearer eyJhbG..." after stripping "Bearer ".

    Returns:
        Decoded payload dict on success, for example:
            {
                "sub": "42",
                "email": "user@example.com",
                "exp": 1234567890,
                "iat": 1234567890,
            }
        None if the token is expired, has an invalid signature, is malformed,
        or if any other verification error occurs.

    Example usage (in dependencies.py):
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        user_id = int(payload["sub"])
    """
    if not token or not token.strip():
        logger.warning("decode_access_token called with empty token.")
        return None

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],  # Always pass as list — jose requires it
        )
        logger.debug("Token decoded successfully for sub=%s.", payload.get("sub"))
        return payload

    except ExpiredSignatureError:
        # Token was valid but has passed its expiry time
        logger.info("JWT token has expired.")
        return None

    except JWTError as exc:
        # Covers invalid signature, malformed token, wrong algorithm, etc.
        logger.warning("JWT verification failed: %s", exc)
        return None

    except Exception as exc:
        # Catch-all for any unexpected decoding error
        logger.error("Unexpected error decoding JWT token: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Helper — extract user ID from token (convenience wrapper)
# ---------------------------------------------------------------------------

def get_user_id_from_token(token: str) -> Optional[int]:
    """
    Convenience wrapper that decodes a token and returns just the user ID.

    Returns None if the token is invalid or does not contain a "sub" claim.

    Args:
        token: Raw JWT string.

    Returns:
        Integer user ID extracted from the "sub" claim, or None.
    """
    payload = decode_access_token(token)
    if payload is None:
        return None

    sub = payload.get("sub")
    if sub is None:
        logger.warning("Token payload missing 'sub' claim.")
        return None

    try:
        return int(sub)
    except (ValueError, TypeError) as exc:
        logger.warning("Could not convert 'sub' claim to int: %s — value was %r", exc, sub)
        return None