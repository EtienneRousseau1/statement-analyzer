from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: Decimal
    month: int
    year: int


class BudgetOut(BaseModel):
    id: int
    category: str
    monthly_limit: Decimal
    month: int
    year: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BudgetStatus(BaseModel):
    category: str
    monthly_limit: Decimal
    spent: Decimal
    remaining: Decimal
    percentage: float
