"""add staff name parts and gender

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-05-22 14:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c8d9e0f1a2b3"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


staff_gender = sa.Enum("MALE", "FEMALE", "OTHER", name="staffgender")


def upgrade() -> None:
    bind = op.get_bind()
    staff_gender.create(bind, checkfirst=True)
    op.add_column("staff", sa.Column("first_name", sa.String(), nullable=True))
    op.add_column("staff", sa.Column("last_name", sa.String(), nullable=True))
    op.add_column("staff", sa.Column("gender", staff_gender, nullable=True))
    op.execute(
        """
        UPDATE staff
        SET first_name = split_part(full_name, ' ', 1),
            last_name = CASE
                WHEN strpos(trim(full_name), ' ') > 0
                THEN substring(trim(full_name) from strpos(trim(full_name), ' ') + 1)
                ELSE ''
            END
        WHERE first_name IS NULL OR last_name IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("staff", "gender")
    op.drop_column("staff", "last_name")
    op.drop_column("staff", "first_name")
    bind = op.get_bind()
    staff_gender.drop(bind, checkfirst=True)
