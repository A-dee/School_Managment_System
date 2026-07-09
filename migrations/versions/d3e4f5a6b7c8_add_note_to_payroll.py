"""add_note_to_payroll

Revision ID: d3e4f5a6b7c8
Revises: c678ba63ace8
Create Date: 2026-07-09 13:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c678ba63ace8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payrolls', sa.Column('note', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('payrolls', 'note')
