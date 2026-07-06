"""add announcement priority

Revision ID: f1a2b3c4d5e6
Revises: c3d4e5f6a7b8
Create Date: 2026-05-21 15:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


announcement_priority = sa.Enum(
    "IMPORTANT",
    "NORMAL",
    "CELEBRATION",
    name="announcementpriority",
)


def upgrade() -> None:
    bind = op.get_bind()
    announcement_priority.create(bind, checkfirst=True)
    op.add_column(
        "announcements",
        sa.Column(
            "priority",
            announcement_priority,
            nullable=False,
            server_default="NORMAL",
        ),
    )
    op.alter_column("announcements", "priority", server_default=None)


def downgrade() -> None:
    op.drop_column("announcements", "priority")
    bind = op.get_bind()
    announcement_priority.drop(bind, checkfirst=True)
