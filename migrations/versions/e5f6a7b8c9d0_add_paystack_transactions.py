"""add paystack_transactions table

Revision ID: e5f6a7b8c9d0
Revises: d1e2f3a4b5c6
Create Date: 2026-05-16 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "paystack_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("initiated_by_user_id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=True),
        sa.Column("reference", sa.String(), nullable=False),
        sa.Column("authorization_url", sa.String(), nullable=True),
        sa.Column("access_code", sa.String(), nullable=True),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="NGN"),
        sa.Column(
            "status",
            sa.Enum("INITIALIZED", "PENDING", "SUCCESS", "FAILED", name="paystacktransactionstatus"),
            nullable=False,
            server_default="INITIALIZED",
        ),
        sa.Column("gateway_response", sa.String(), nullable=True),
        sa.Column("paystack_transaction_id", sa.String(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("raw_initialize_response", sa.JSON(), nullable=True),
        sa.Column("raw_verify_response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["initiated_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_paystack_transactions_id"), "paystack_transactions", ["id"], unique=False)
    op.create_index(op.f("ix_paystack_transactions_reference"), "paystack_transactions", ["reference"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_paystack_transactions_reference"), table_name="paystack_transactions")
    op.drop_index(op.f("ix_paystack_transactions_id"), table_name="paystack_transactions")
    op.drop_table("paystack_transactions")
    sa.Enum(name="paystacktransactionstatus").drop(op.get_bind(), checkfirst=True)
