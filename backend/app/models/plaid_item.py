from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class PlaidItem(Base):
    """One bank login connected through Plaid.

    A single login can expose several accounts (checking + savings + card),
    so Account rows point back at this table rather than the reverse.
    """

    __tablename__ = "plaid_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    item_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # Encrypted with a key held outside the database, so a Postgres dump alone
    # yields no usable bank tokens. Cleared on disconnect once Plaid revokes it,
    # while the row stays behind to keep already-synced history attributable.
    access_token_encrypted: Mapped[str | None] = mapped_column(Text)
    institution_id: Mapped[str | None] = mapped_column(String(100))
    institution_name: Mapped[str | None] = mapped_column(String(255))
    # Position in Plaid's transaction stream. Only advanced after the matching
    # rows commit, so an interrupted sync replays instead of skipping updates.
    sync_cursor: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, login_required, disconnected
    error_code: Mapped[str | None] = mapped_column(String(100))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="plaid_items")
    accounts: Mapped[list["Account"]] = relationship(back_populates="plaid_item")
