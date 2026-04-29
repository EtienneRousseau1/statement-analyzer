from datetime import datetime
from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    institution: str | None = None
    account_type: str = "checking"
    last_four: str | None = None


class AccountOut(BaseModel):
    id: int
    name: str
    institution: str | None
    account_type: str
    last_four: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
