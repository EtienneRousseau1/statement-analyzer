from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
import json
import hashlib
from datetime import datetime
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.account import Account
from ..models.statement import Statement
from ..models.transaction import Transaction
from ..schemas.statement import UploadResponse, StatementOut
from ..schemas.transaction import ConfirmUpload, TransactionOut
from ..services.pdf_extractor import extract_text_from_pdf
from ..services.csv_parser import normalize_csv
from ..services.claude_parser import parse_statement

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_TYPES = {"application/pdf", "text/csv", "application/vnd.ms-excel"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("", response_model=UploadResponse)
async def upload_statement(
    file: UploadFile = File(...),
    account_id: int = Form(...),
    statement_source: str = Form("credit_card"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "csv"):
        raise HTTPException(status_code=415, detail="Only PDF and CSV files are supported")

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    duplicate_statement = (
        db.query(Statement)
        .filter(Statement.user_id == current_user.id, Statement.file_hash == file_hash)
        .first()
    )
    if duplicate_statement:
        if duplicate_statement.status == "confirmed":
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Duplicate upload detected: this file was already uploaded as statement #{duplicate_statement.id} "
                    f"({duplicate_statement.filename})"
                ),
            )
        # Allow retry when a previous upload failed or was never confirmed.
        db.delete(duplicate_statement)
        db.commit()

    if statement_source not in ("credit_card", "bank_account"):
        raise HTTPException(status_code=422, detail="statement_source must be 'credit_card' or 'bank_account'")

    statement = Statement(
        user_id=current_user.id,
        account_id=account_id,
        filename=filename,
        file_type=ext,
        file_hash=file_hash,
        statement_source=statement_source,
        status="pending",
    )
    db.add(statement)
    db.commit()
    db.refresh(statement)

    try:
        raw_text = extract_text_from_pdf(file_bytes) if ext == "pdf" else normalize_csv(file_bytes)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="No extractable text found in the uploaded file")
        previews = parse_statement(raw_text, statement_source)
        
        # Cache previews as JSON
        previews_data = [
            {
                "date": str(p.date),
                "description": p.description,
                "amount": str(p.amount),
                "transaction_type": p.transaction_type,
                "category": p.category,
            }
            for p in previews
        ]
        statement.previews_json = json.dumps(previews_data)
        statement.status = "parsed"
        statement.transaction_count = len(previews)
        db.commit()
    except Exception as e:
        if isinstance(e, HTTPException):
            statement.status = "failed"
            db.commit()
            raise e
        statement.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

    return UploadResponse(
        statement=StatementOut.model_validate(statement),
        preview=previews,
        message=f"Found {len(previews)} transactions. Review and confirm to save.",
    )


@router.post("/confirm", response_model=list[TransactionOut])
def confirm_upload(
    payload: ConfirmUpload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = db.query(Statement).filter(
        Statement.id == payload.statement_id, Statement.user_id == current_user.id
    ).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    if statement.status != "parsed":
        raise HTTPException(status_code=400, detail="Statement has not been parsed yet")

    # Parse cached previews and insert as transactions
    previews_data = json.loads(statement.previews_json or "[]")
    
    created_transactions = []
    for preview in previews_data:
        tx = Transaction(
            user_id=current_user.id,
            account_id=statement.account_id,
            statement_id=statement.id,
            date=preview["date"],
            description=preview["description"],
            amount=preview["amount"],
            transaction_type=preview["transaction_type"],
            category=preview["category"],
            confirmed=True,
        )
        db.add(tx)
        created_transactions.append(tx)
    
    statement.status = "confirmed"
    db.commit()

    # Refresh all to get IDs
    for tx in created_transactions:
        db.refresh(tx)

    return created_transactions


@router.get("/statements", response_model=list[StatementOut])
def list_statements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Statement)
        .filter(Statement.user_id == current_user.id, Statement.status == "confirmed")
        .order_by(Statement.uploaded_at.desc())
        .all()
    )


@router.patch("/statements/{statement_id}", response_model=StatementOut)
def reassign_statement(
    statement_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = db.query(Statement).filter(
        Statement.id == statement_id, Statement.user_id == current_user.id
    ).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")

    new_account_id = payload.get("account_id")
    if not new_account_id:
        raise HTTPException(status_code=422, detail="account_id required")

    account = db.query(Account).filter(Account.id == new_account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    statement.account_id = new_account_id
    db.query(Transaction).filter(Transaction.statement_id == statement_id).update({"account_id": new_account_id})
    db.commit()
    db.refresh(statement)
    return statement


@router.delete("/statements/{statement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_statement(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = db.query(Statement).filter(
        Statement.id == statement_id, Statement.user_id == current_user.id
    ).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    db.query(Transaction).filter(Transaction.statement_id == statement_id).delete()
    db.delete(statement)
    db.commit()
