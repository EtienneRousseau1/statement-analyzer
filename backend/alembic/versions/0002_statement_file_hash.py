"""add statement file hash for duplicate detection

Revision ID: 0002_statement_file_hash
Revises: 0001_initial_schema
Create Date: 2026-06-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_statement_file_hash"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("statements", sa.Column("file_hash", sa.String(length=64), nullable=True))
    op.create_index("ix_statements_file_hash", "statements", ["file_hash"], unique=False)
    op.create_unique_constraint("uq_statement_user_file_hash", "statements", ["user_id", "file_hash"])


def downgrade() -> None:
    op.drop_constraint("uq_statement_user_file_hash", "statements", type_="unique")
    op.drop_index("ix_statements_file_hash", table_name="statements")
    op.drop_column("statements", "file_hash")
