"""merge alembic heads

Revision ID: b7c8d9e0f1a2
Revises: a7d3c4e5f601, e5f6a7b8c9d0, f1a2b3c4d5e6
Create Date: 2026-05-22 12:30:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "b7c8d9e0f1a2"
down_revision = ("a7d3c4e5f601", "e5f6a7b8c9d0", "f1a2b3c4d5e6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
