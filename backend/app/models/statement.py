from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Statement(Base):
    __tablename__ = "statements"
    __table_args__ = (
        UniqueConstraint("user_id", "file_hash", name="uq_statement_user_file_hash"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf, csv
    file_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    statement_source: Mapped[str | None] = mapped_column(String(20))  # credit_card, bank_account
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, parsed, confirmed, failed
    transaction_count: Mapped[int | None]
    previews_json: Mapped[str | None] = mapped_column(Text)  # Cached JSON of transaction previews
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="statements")
    account: Mapped["Account"] = relationship(back_populates="statements")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="statement")
