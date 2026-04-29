from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel


class TransactionOut(BaseModel):
    id: int
    account_id: int
    statement_id: int | None
    date: date
    description: str
    amount: Decimal
    transaction_type: str
    category: str
    confirmed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionPatch(BaseModel):
    category: str | None = None


class TransactionPreview(BaseModel):
    date: date
    description: str
    amount: Decimal
    transaction_type: str
    category: str


class ConfirmUpload(BaseModel):
    statement_id: int
