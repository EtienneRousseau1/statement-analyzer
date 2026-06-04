from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..models.user import User
from typing import Optional


def get_current_user(
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract user from X-User-Email header (set by frontend).
    This is a simplified auth flow for development.
    In production, verify actual JWT tokens.
    """
    if not x_user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Email header required"
        )

    # Find user by email; create if doesn't exist (auto-upsert on first access)
    user = db.query(User).filter(User.email == x_user_email).first()
    if not user:
        # This could happen if user logs in via OAuth but never hit an auth/me endpoint
        # For now, create/trust them based on the header
        user = User(
            email=x_user_email,
            name=x_user_email.split("@")[0],  # Use part before @ as temporary name
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
