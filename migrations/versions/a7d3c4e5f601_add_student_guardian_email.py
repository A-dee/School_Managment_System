"""add student guardian email

Revision ID: a7d3c4e5f601
Revises: fbbb0cddcd30
Create Date: 2026-05-21 20:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a7d3c4e5f601"
down_revision = "fbbb0cddcd30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("guardian_email", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "guardian_email")
