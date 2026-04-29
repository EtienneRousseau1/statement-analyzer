from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    email: str
    name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpsert(BaseModel):
    email: str
    name: str | None = None
    google_id: str | None = None
