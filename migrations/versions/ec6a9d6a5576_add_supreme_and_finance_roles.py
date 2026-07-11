"""add_supreme_and_finance_roles

Revision ID: ec6a9d6a5576
Revises: 0d697329769b
Create Date: 2026-07-11 18:29:40.849545

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ec6a9d6a5576'
down_revision: Union[str, None] = '0d697329769b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SUPREME_ADMIN'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'FINANCE'")


def downgrade() -> None:
    # PostgreSQL cannot drop enum values without recreating the type. Keep this
    # downgrade as a no-op to avoid corrupting existing users with these roles.
    pass
