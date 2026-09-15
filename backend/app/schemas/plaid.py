from datetime import datetime
from pydantic import BaseModel
from .account import AccountOut


class LinkTokenOut(BaseModel):
    link_token: str
    expiration: datetime


class ExchangeIn(BaseModel):
    public_token: str


class PlaidItemOut(BaseModel):
    id: int
    institution_name: str | None
    status: str
    error_code: str | None
    last_synced_at: datetime | None
    created_at: datetime
    accounts: list[AccountOut] = []

    model_config = {"from_attributes": True}


class SyncResultOut(BaseModel):
    added: int
    modified: int
    removed: int
    last_synced_at: datetime | None
    # NOT_READY while Plaid is still assembling the initial history, so the UI
    # can say "still preparing" instead of "no transactions".
    update_status: str | None = None


class CapacityOut(BaseModel):
    can_connect: bool
    active_items: int
    limit: int
