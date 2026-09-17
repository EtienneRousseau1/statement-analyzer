from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


CATEGORIES = [
    "Food & Dining",
    "Shopping",
    "Transport",
    "Entertainment",
    "Utilities",
    "Health",
    "Travel",
    "Subscriptions",
    "Rent",
    "Income",
    # Money moved between the user's own accounts (card payments, transfers).
    # Excluded from spending totals so a card payment isn't counted once in
    # checking and again as the charges it settles.
    "Transfers",
    "Other",
]

# Categories that represent money moving between a user's own accounts rather
# than entering or leaving their finances. Summing them as spending counts a
# card payment twice: once leaving checking, again as the charges it settles.
SPEND_EXCLUDED_CATEGORIES = ("Transfers",)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    statement_id: Mapped[int | None] = mapped_column(ForeignKey("statements.id"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), default="debit")  # debit, credit
    category: Mapped[str] = mapped_column(String(100), default="Other")
    raw_category: Mapped[str | None] = mapped_column(String(100))  # original from Claude
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(20), default="upload")  # upload, plaid
    plaid_transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    # Plaid reports a transaction as pending, then re-reports it as posted.
    pending: Mapped[bool] = mapped_column(Boolean, default=False)
    # Set when a user recategorizes by hand, so later Plaid updates to this
    # transaction don't silently overwrite their choice.
    category_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="transactions")
    account: Mapped["Account"] = relationship(back_populates="transactions")
    statement: Mapped["Statement | None"] = relationship(back_populates="transactions")
