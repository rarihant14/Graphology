"""
auth/router.py — OAuth 2.0 authentication routes for Google only.

Implements the full OAuth authorization code flow for Google:

  Browser → GET /auth/google
          → Google consent screen
          → GET /auth/google/callback?code=...
          → Exchange code for token
          → Fetch user profile from Google
          → Create or fetch user in DB
          → Issue signed JWT
          → Redirect to React frontend with token in URL

Protected routes:
  GET /auth/me      — returns current user profile (requires JWT)
  GET /auth/logout  — stateless logout acknowledgement

Environment variables required:
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
"""

import logging
import os
from typing import Optional

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.schemas import UserCreate, UserRead
from auth.utils import create_access_token
from database import Analysis, User, get_db

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Environment variables
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "https://graphology-846t.onrender.com/auth/google/callback")

FRONTEND_SUCCESS_URL = os.getenv("FRONTEND_SUCCESS_URL", "https://graphology-5f7b.onrender.com/home")

FRONTEND_ERROR_URL = os.getenv("FRONTEND_ERROR_URL", "https://graphology-5f7b.onrender.com/login?error=auth_failed")
# Google OAuth endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _get_or_create_user(
    db: Session,
    email: str,
    name: str,
    avatar_url: Optional[str],
    provider: str,
    provider_id: str,
) -> User:
    """
    Fetch an existing user by provider + provider_id, or create a new one.
    Falls back to email lookup to avoid duplicate accounts.
    """
    # First try: look up by provider + provider_id
    user = (
        db.query(User)
        .filter(User.provider == provider, User.provider_id == str(provider_id))
        .first()
    )

    if user:
        user.name = name
        user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        logger.info("Returning user logged in — id=%d email=%s.", user.id, user.email)
        return user

    # Second try: look up by email
    user = db.query(User).filter(User.email == email).first()
    if user:
        logger.info(
            "Existing user found by email — id=%d. Updating provider info.", user.id
        )
        user.provider = provider
        user.provider_id = str(provider_id)
        user.name = name
        user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        return user

    # New user
    new_user = User(
        email=email,
        name=name,
        avatar_url=avatar_url,
        provider=provider,
        provider_id=str(provider_id),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info("New user created — id=%d email=%s.", new_user.id, new_user.email)
    return new_user


def _build_token_redirect(user: User) -> RedirectResponse:
    """
    Issue a JWT for the user and redirect to the React frontend
    with the token embedded as a URL query parameter.
    """
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    redirect_url = f"{FRONTEND_SUCCESS_URL}?token={token}"
    logger.info("Redirecting user_id=%d to frontend with JWT.", user.id)
    return RedirectResponse(url=redirect_url)


# ---------------------------------------------------------------------------
# Google OAuth routes
# ---------------------------------------------------------------------------

@router.get("/google", summary="Initiate Google OAuth flow")
async def google_login() -> RedirectResponse:
    """
    Redirect the user to Google's OAuth 2.0 consent screen.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth credentials are not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server.",
        )

    async with AsyncOAuth2Client(
        client_id=GOOGLE_CLIENT_ID,
        redirect_uri=GOOGLE_REDIRECT_URI,
        scope="openid email profile",
    ) as client:
        auth_url, _ = client.create_authorization_url(GOOGLE_AUTH_URL)

    logger.info("Redirecting to Google OAuth: %s", auth_url[:80])
    return RedirectResponse(url=auth_url)


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """
    Handle the callback redirect from Google after the user grants consent.
    Exchanges code for token, fetches profile, creates/fetches user, issues JWT.
    """
    if error or not code:
        logger.warning("Google OAuth error or denied consent: error=%s", error)
        return RedirectResponse(url=FRONTEND_ERROR_URL)

    try:
        async with AsyncOAuth2Client(
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            redirect_uri=GOOGLE_REDIRECT_URI,
        ) as client:
            token_data = await client.fetch_token(
                GOOGLE_TOKEN_URL, code=code
            )
            access_token = token_data.get("access_token")

            if not access_token:
                logger.error("Google token exchange returned no access_token.")
                return RedirectResponse(url=FRONTEND_ERROR_URL)

            response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            user_info = response.json()

        logger.info("Google user info fetched: sub=%s", user_info.get("sub"))

        email: str = user_info.get("email", "")
        name: str = user_info.get("name") or user_info.get("given_name", "Unknown")
        avatar_url: Optional[str] = user_info.get("picture")
        provider_id: str = user_info.get("sub", "")

        if not email or not provider_id:
            logger.error("Google profile missing email or sub: %s", user_info)
            return RedirectResponse(url=FRONTEND_ERROR_URL)

        user = _get_or_create_user(
            db=db,
            email=email,
            name=name,
            avatar_url=avatar_url,
            provider="google",
            provider_id=provider_id,
        )

        return _build_token_redirect(user)

    except httpx.HTTPStatusError as exc:
        logger.error("HTTP error during Google OAuth: %s", exc)
        return RedirectResponse(url=FRONTEND_ERROR_URL)

    except Exception as exc:
        logger.exception("Unexpected error during Google OAuth callback: %s", exc)
        return RedirectResponse(url=FRONTEND_ERROR_URL)


# ---------------------------------------------------------------------------
# Protected routes
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    """
    Return the profile of the currently authenticated user.
    Requires a valid JWT in the Authorization: Bearer header.
    """
    logger.debug("GET /auth/me — user_id=%d", current_user.id)
    return UserRead.model_validate(current_user)


@router.get("/logout", summary="Logout acknowledgement")
def logout() -> dict:
    """
    Stateless logout endpoint.
    Actual logout is performed client-side by discarding the in-memory token.
    """
    return {"message": "Logged out successfully. Please discard your token."}


# ---------------------------------------------------------------------------
# Analysis history route
# ---------------------------------------------------------------------------

@router.get(
    "/history",
    summary="Get current user's analysis history",
)
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    """
    Return the last 10 graphology analyses for the authenticated user,
    ordered by most recent first.
    """
    analyses = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )

    logger.info(
        "GET /auth/history — user_id=%d, returning %d analyses.",
        current_user.id,
        len(analyses),
    )

    return [
        {
            "id": a.id,
            "personality_traits": a.personality_traits,
            "disclaimer": a.disclaimer,
            "created_at": a.created_at.isoformat(),
        }
        for a in analyses
    ]
