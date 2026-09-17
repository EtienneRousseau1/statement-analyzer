from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.budget import Budget
from ..models.transaction import Transaction
from ..schemas.budget import BudgetCreate, BudgetOut, BudgetStatus

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    month: int | None = Query(None),
    year: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Budget).filter(Budget.user_id == current_user.id)
    if month:
        q = q.filter(Budget.month == month)
    if year:
        q = q.filter(Budget.year == year)
    return q.all()


@router.post("", response_model=BudgetOut)
def upsert_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == payload.category,
        Budget.month == payload.month,
        Budget.year == payload.year,
    ).first()

    if existing:
        existing.monthly_limit = payload.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing

    budget = Budget(**payload.model_dump(), user_id=current_user.id)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()


@router.get("/status", response_model=list[BudgetStatus])
def budget_status(
    month: int = Query(default=date.today().month),
    year: int = Query(default=date.today().year),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == month,
        Budget.year == year,
    ).all()

    results = []
    for budget in budgets:
        spent_row = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category == budget.category,
                Transaction.transaction_type == "debit",
                # The dashboard has always counted only confirmed rows; budget
                # progress didn't, so unconfirmed uploads inflated it.
                Transaction.confirmed.is_(True),
                func.extract("month", Transaction.date) == month,
                func.extract("year", Transaction.date) == year,
            )
            .scalar()
        )
        spent = Decimal(str(spent_row or 0))
        remaining = budget.monthly_limit - spent
        percentage = float(spent / budget.monthly_limit * 100) if budget.monthly_limit > 0 else 0.0

        results.append(
            BudgetStatus(
                category=budget.category,
                monthly_limit=budget.monthly_limit,
                spent=spent,
                remaining=remaining,
                percentage=round(percentage, 1),
            )
        )
    return results
