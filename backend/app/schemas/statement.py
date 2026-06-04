from datetime import datetime
from pydantic import BaseModel
from .transaction import TransactionPreview


class StatementOut(BaseModel):
    id: int
    account_id: int
    filename: str
    file_type: str
    statement_source: str | None
    status: str
    transaction_count: int | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    statement: StatementOut
    preview: list[TransactionPreview]
    message: str
