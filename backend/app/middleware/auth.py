from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Verify the signed token minted by the frontend's NextAuth session
    callback (HS256, signed with the shared NEXTAUTH_SECRET/AUTH_SECRET) and
    resolve the user from its verified `email` claim. Replaces trusting a
    plain client-supplied X-User-Email header, which let anyone who could
    reach this API directly impersonate any user by just setting a header.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.nextauth_secret,
            algorithms=["HS256"],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email claim",
        )

    # Find user by email; create if doesn't exist (auto-upsert on first access)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=email.split("@")[0],  # Use part before @ as temporary name
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
