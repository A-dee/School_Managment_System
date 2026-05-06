"""add school events calendar

Revision ID: af90e55a73c7
Revises: c3d4e5f6a7b8
Create Date: 2026-05-06 15:20:35.830865

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'af90e55a73c7'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('school_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('event_type', sa.Enum('HOLIDAY', 'EXAM', 'MEETING', 'ACTIVITY', 'OTHER', name='eventtype'), nullable=False),
    sa.Column('is_public', sa.Boolean(), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_school_events_id'), 'school_events', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_school_events_id'), table_name='school_events')
    op.drop_table('school_events')
    op.execute("DROP TYPE IF EXISTS eventtype")
