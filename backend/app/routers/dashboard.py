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
    income: Decimal = Decimal("0")


class DashboardSummary(BaseModel):
    total_spent_this_month: Decimal
    total_income_this_month: Decimal
    total_spent_all_time: Decimal
    total_income_all_time: Decimal
    by_category: list[CategoryTotal]
    by_category_all_time: list[CategoryTotal]
    income_by_category: list[CategoryTotal]
    monthly_trend: list[MonthlyTotal]
    account_count: int
    transaction_count_this_month: int
    transaction_count_all_time: int


@router.get("/summary", response_model=DashboardSummary)
def summary(
    month: int = Query(default=date.today().month),
    year: int = Query(default=date.today().year),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    all_confirmed = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.confirmed.is_(True),
    )

    month_base = all_confirmed.filter(
        func.extract("month", Transaction.date) == month,
        func.extract("year", Transaction.date) == year,
    )

    total_spent_month = (
        month_base.filter(Transaction.transaction_type == "debit")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
    ) or Decimal("0")

    total_income_month = (
        month_base.filter(Transaction.transaction_type == "credit")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
    ) or Decimal("0")

    total_spent_all_time = (
        all_confirmed.filter(Transaction.transaction_type == "debit")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
    ) or Decimal("0")

    total_income_all_time = (
        all_confirmed.filter(Transaction.transaction_type == "credit")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
    ) or Decimal("0")

    tx_count_month = month_base.count()
    tx_count_all_time = all_confirmed.count()

    by_category_rows = (
        month_base.filter(Transaction.transaction_type == "debit")
        .with_entities(Transaction.category, func.sum(Transaction.amount))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    by_category = [CategoryTotal(category=row[0], total=Decimal(str(row[1]))) for row in by_category_rows]

    by_category_all_time_rows = (
        all_confirmed.filter(Transaction.transaction_type == "debit")
        .with_entities(Transaction.category, func.sum(Transaction.amount))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    by_category_all_time = [
        CategoryTotal(category=row[0], total=Decimal(str(row[1]))) for row in by_category_all_time_rows
    ]

    spend_rows = (
        db.query(
            func.extract("year", Transaction.date).label("yr"),
            func.extract("month", Transaction.date).label("mo"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.confirmed.is_(True),
            Transaction.transaction_type == "debit",
        )
        .group_by("yr", "mo")
        .all()
    )

    income_rows = (
        db.query(
            func.extract("year", Transaction.date).label("yr"),
            func.extract("month", Transaction.date).label("mo"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.confirmed.is_(True),
            Transaction.transaction_type == "credit",
        )
        .group_by("yr", "mo")
        .all()
    )

    spend_map = {(int(r.yr), int(r.mo)): Decimal(str(r.total)) for r in spend_rows}
    income_map = {(int(r.yr), int(r.mo)): Decimal(str(r.total)) for r in income_rows}
    all_month_keys = sorted(set(spend_map.keys()) | set(income_map.keys()))

    monthly_trend = [
        MonthlyTotal(
            year=yr,
            month=mo,
            total=spend_map.get((yr, mo), Decimal("0")),
            income=income_map.get((yr, mo), Decimal("0")),
        )
        for yr, mo in all_month_keys
    ]

    income_by_category_rows = (
        month_base.filter(Transaction.transaction_type == "credit")
        .with_entities(Transaction.category, func.sum(Transaction.amount))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    income_by_category = [
        CategoryTotal(category=row[0], total=Decimal(str(row[1]))) for row in income_by_category_rows
    ]

    account_count = db.query(Account).filter(Account.user_id == current_user.id).count()

    return DashboardSummary(
        total_spent_this_month=Decimal(str(total_spent_month)),
        total_income_this_month=Decimal(str(total_income_month)),
        total_spent_all_time=Decimal(str(total_spent_all_time)),
        total_income_all_time=Decimal(str(total_income_all_time)),
        by_category=by_category,
        by_category_all_time=by_category_all_time,
        income_by_category=income_by_category,
        monthly_trend=monthly_trend,
        account_count=account_count,
        transaction_count_this_month=tx_count_month,
        transaction_count_all_time=tx_count_all_time,
    )
