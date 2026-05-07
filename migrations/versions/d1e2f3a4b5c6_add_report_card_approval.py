"""add_report_card_approval

Revision ID: d1e2f3a4b5c6
Revises: fbbb0cddcd30
Create Date: 2026-05-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'fbbb0cddcd30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('report_card_meta', sa.Column('approved', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('report_card_meta', sa.Column('approved_by_id', sa.Integer(), nullable=True))
    op.add_column('report_card_meta', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.create_foreign_key(
        'fk_report_card_meta_approved_by', 'report_card_meta', 'users',
        ['approved_by_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_report_card_meta_approved_by', 'report_card_meta', type_='foreignkey')
    op.drop_column('report_card_meta', 'approved_at')
    op.drop_column('report_card_meta', 'approved_by_id')
    op.drop_column('report_card_meta', 'approved')
