"""add plaid bank connections

Revision ID: 0004_plaid_link
Revises: 0003_statement_source
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0004_plaid_link"
down_revision = "0003_statement_source"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plaid_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("item_id", sa.String(length=255), nullable=False),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("institution_name", sa.String(length=255), nullable=True),
        sa.Column("sync_cursor", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("item_id", name="uq_plaid_item_id"),
    )

    op.add_column(
        "accounts",
        sa.Column("plaid_item_id", sa.Integer(), sa.ForeignKey("plaid_items.id"), nullable=True),
    )
    op.add_column("accounts", sa.Column("plaid_account_id", sa.String(length=255), nullable=True))
    op.create_unique_constraint("uq_account_plaid_account_id", "accounts", ["plaid_account_id"])

    # server_default backfills existing rows and keeps non-ORM inserts (psql,
    # fixtures) from tripping the NOT NULL constraint.
    op.add_column(
        "transactions",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="upload"),
    )
    op.add_column("transactions", sa.Column("plaid_transaction_id", sa.String(length=255), nullable=True))
    op.add_column(
        "transactions",
        sa.Column("pending", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "transactions",
        sa.Column("category_overridden", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Postgres allows many NULLs under a unique constraint, so uploaded rows are
    # unaffected while synced rows can't be imported twice.
    op.create_unique_constraint("uq_transaction_plaid_id", "transactions", ["plaid_transaction_id"])


def downgrade() -> None:
    op.drop_constraint("uq_transaction_plaid_id", "transactions", type_="unique")
    op.drop_column("transactions", "category_overridden")
    op.drop_column("transactions", "pending")
    op.drop_column("transactions", "plaid_transaction_id")
    op.drop_column("transactions", "source")
    op.drop_constraint("uq_account_plaid_account_id", "accounts", type_="unique")
    op.drop_column("accounts", "plaid_account_id")
    op.drop_column("accounts", "plaid_item_id")
    op.drop_table("plaid_items")
