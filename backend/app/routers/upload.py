from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
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

    statement = Statement(
        user_id=current_user.id,
        account_id=account_id,
        filename=filename,
        file_type=ext,
        status="pending",
    )
    db.add(statement)
    db.commit()
    db.refresh(statement)

    try:
        raw_text = extract_text_from_pdf(file_bytes) if ext == "pdf" else normalize_csv(file_bytes)
        previews = parse_statement(raw_text)
        statement.status = "parsed"
        statement.transaction_count = len(previews)
        db.commit()
    except Exception as e:
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

    # Re-parse to get transactions (in a real app you'd cache the preview)
    # For now, mark statement confirmed and return existing transactions if any
    statement.status = "confirmed"
    db.commit()

    saved = db.query(Transaction).filter(Transaction.statement_id == statement.id).all()
    return saved
