"""add statement_source to distinguish credit card vs bank account

Revision ID: 0003_statement_source
Revises: 0002_statement_file_hash
Create Date: 2026-06-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0003_statement_source"
down_revision = "0002_statement_file_hash"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("statements", sa.Column("statement_source", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("statements", "statement_source")
