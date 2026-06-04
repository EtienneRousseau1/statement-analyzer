from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.transaction import Transaction
from ..schemas.transaction import TransactionOut, TransactionPatch

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    account_id: int | None = Query(None),
    category: str | None = Query(None),
    month: int | None = Query(None),
    year: int | None = Query(None),
    transaction_type: str | None = Query(None),
    sort: str = Query("date_desc", pattern="^(date_desc|amount_desc)$"),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if category:
        q = q.filter(Transaction.category == category)
    if month:
        q = q.filter(func.extract("month", Transaction.date) == month)
    if year:
        q = q.filter(func.extract("year", Transaction.date) == year)
    if transaction_type:
        q = q.filter(Transaction.transaction_type == transaction_type)
    if sort == "amount_desc":
        q = q.order_by(Transaction.amount.desc(), Transaction.date.desc())
    else:
        q = q.order_by(Transaction.date.desc())
    return q.offset(offset).limit(limit).all()


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id, Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if payload.category:
        tx.category = payload.category
    db.commit()
    db.refresh(tx)
    return tx
