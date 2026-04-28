"""add scholarship percentage to students

Revision ID: a1b2c3d4e5f6
Revises: fbbb0cddcd30
Create Date: 2026-04-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'fbbb0cddcd30'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('students', sa.Column('scholarship_percentage', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('students', 'scholarship_percentage')
