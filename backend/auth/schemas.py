"""
auth/schemas.py — Pydantic v2 schemas for authentication and user management.

These schemas serve as the data contracts between:
  - The OAuth callback handler and the database layer
  - The API response serialization and the React frontend
  - The JWT token payload and the protected route dependencies

Schema hierarchy:
  UserBase
    ├── UserCreate   (used when inserting a new user into the DB)
    └── UserRead     (used when returning user data in API responses)

  TokenResponse     (returned to frontend after successful OAuth login)
  OAuthCallback     (validates the query params from the OAuth provider callback)
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------

class UserBase(BaseModel):
    """
    Shared base schema containing the core fields present on every user object.

    Used as the foundation for both UserCreate and UserRead to avoid
    repeating field definitions. Never returned directly from an endpoint —
    always use UserCreate or UserRead instead.
    """

    email: EmailStr = Field(
        ...,
        description="User's email address — must be a valid email format.",
        examples=["user@example.com"],
    )

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Display name pulled from the OAuth provider's profile.",
        examples=["Jane Doe"],
    )

    avatar_url: Optional[str] = Field(
        default=None,
        description="Profile picture URL from the OAuth provider. May be None if the provider does not supply one.",
        examples=["https://lh3.googleusercontent.com/a/example"],
    )

    provider: str = Field(
        ...,
        description="OAuth provider used to authenticate. Expected values: 'google' or 'github'.",
        examples=["google"],
    )

    provider_id: str = Field(
        ...,
        description="The user's unique ID on the OAuth provider's platform. Stored as a string to accommodate both integer (GitHub) and long numeric string (Google) formats.",
        examples=["117294837562910483920"],
    )

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        """Ensure only supported OAuth providers are accepted."""
        allowed = {"google", "github"}
        if v.lower() not in allowed:
            raise ValueError(f"Provider must be one of {allowed}. Got: {v!r}")
        return v.lower()

    model_config = {
        "str_strip_whitespace": True,  # Strip leading/trailing whitespace from all str fields
    }


class UserCreate(UserBase):
    """
    Schema used when creating a new user record in the database.

    Inherits all fields from UserBase with no additions — it exists as a
    separate class to clearly signal intent (creation vs reading) and to
    allow future create-specific fields (e.g. referral codes) to be added
    without modifying UserBase or UserRead.

    Example usage:
        user_data = UserCreate(
            email="jane@example.com",
            name="Jane Doe",
            provider="google",
            provider_id="117294837562910483920",
        )
        db_user = User(**user_data.model_dump())
    """
    pass


class UserRead(UserBase):
    """
    Schema used when returning user data from API endpoints.

    Extends UserBase with database-generated fields (id, created_at) that
    are only available after the record has been persisted. This is the
    schema included inside TokenResponse and returned from /auth/me.

    The model_config enables ORM mode so SQLAlchemy model instances can
    be passed directly without manual serialisation.

    Example usage:
        user = db.query(User).filter(User.id == user_id).first()
        return UserRead.model_validate(user)
    """

    id: int = Field(
        ...,
        description="Auto-incremented primary key assigned by the database.",
        examples=[42],
    )

    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the user account was first created.",
        examples=["2026-02-23T14:30:00"],
    )

    model_config = {
        "from_attributes": True,        # Enables ORM mode — allows SQLAlchemy model → Pydantic
        "str_strip_whitespace": True,
    }


# ---------------------------------------------------------------------------
# Token schema
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    """
    Schema returned to the React frontend after a successful OAuth login.

    The frontend receives this (via URL query param redirect) and stores
    the access_token in memory for use in subsequent API requests via the
    Authorization: Bearer header.

    Fields:
        access_token  — signed JWT string containing user id and expiry
        token_type    — always "bearer" per OAuth2 convention
        user          — full user profile so the frontend doesn't need
                        a separate /me call immediately after login
    """

    access_token: str = Field(
        ...,
        description="Signed JWT access token. Include this in the Authorization header as 'Bearer {access_token}' for all protected endpoints.",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
    )

    token_type: str = Field(
        default="bearer",
        description="Token type — always 'bearer' per OAuth2 spec.",
        examples=["bearer"],
    )

    user: UserRead = Field(
        ...,
        description="Full user profile of the authenticated user. Allows the frontend to immediately populate the UI without a separate /auth/me call.",
    )

    model_config = {
        "from_attributes": True,
    }


# ---------------------------------------------------------------------------
# OAuth callback schema
# ---------------------------------------------------------------------------

class OAuthCallback(BaseModel):
    """
    Schema for validating query parameters received from an OAuth provider
    callback redirect.

    When a user completes the OAuth consent screen, the provider redirects
    them back to our callback URL with these query parameters appended:
      ?code=AUTHORIZATION_CODE&state=CSRF_TOKEN

    Fields:
        code   — the one-time authorization code to exchange for an access token
        state  — the CSRF state token originally sent to the provider;
                 optional here since some providers omit it in certain flows
    """

    code: str = Field(
        ...,
        description="One-time authorization code provided by the OAuth provider. Exchanged server-side for an access token.",
        examples=["4/0AX4XfWj..."],
    )

    state: Optional[str] = Field(
        default=None,
        description="CSRF protection token. Should match the state value originally sent to the OAuth provider. Optional since some provider flows omit it.",
        examples=["random_csrf_string_abc123"],
    )

    model_config = {
        "str_strip_whitespace": True,
    }