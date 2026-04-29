from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.transaction import Transaction
from ..models.account import Account
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class CategoryTotal(BaseModel):
    category: str
    total: Decimal


class MonthlyTotal(BaseModel):
    year: int
    month: int
    total: Decimal


class DashboardSummary(BaseModel):
    total_spent_this_month: Decimal
    total_income_this_month: Decimal
    by_category: list[CategoryTotal]
    monthly_trend: list[MonthlyTotal]
    account_count: int
    transaction_count_this_month: int


@router.get("/summary", response_model=DashboardSummary)
def summary(
    month: int = Query(default=date.today().month),
    year: int = Query(default=date.today().year),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        func.extract("month", Transaction.date) == month,
        func.extract("year", Transaction.date) == year,
    )

    total_spent = (
        base.filter(Transaction.transaction_type == "debit")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
    ) or Decimal("0")

    total_income = (
        base.filter(Transaction.transaction_type == "credit")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
    ) or Decimal("0")

    tx_count = base.count()

    by_category_rows = (
        base.filter(Transaction.transaction_type == "debit")
        .with_entities(Transaction.category, func.sum(Transaction.amount))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    by_category = [CategoryTotal(category=row[0], total=Decimal(str(row[1]))) for row in by_category_rows]

    trend_rows = (
        db.query(
            func.extract("year", Transaction.date).label("yr"),
            func.extract("month", Transaction.date).label("mo"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "debit",
        )
        .group_by("yr", "mo")
        .order_by("yr", "mo")
        .limit(6)
        .all()
    )
    monthly_trend = [
        MonthlyTotal(year=int(row.yr), month=int(row.mo), total=Decimal(str(row.total)))
        for row in trend_rows
    ]

    account_count = db.query(Account).filter(Account.user_id == current_user.id).count()

    return DashboardSummary(
        total_spent_this_month=Decimal(str(total_spent)),
        total_income_this_month=Decimal(str(total_income)),
        by_category=by_category,
        monthly_trend=monthly_trend,
        account_count=account_count,
        transaction_count_this_month=tx_count,
    )
