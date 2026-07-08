import enum
from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base


class InstallmentMilestoneStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    OVERDUE = "OVERDUE"


class FeeInstallmentPlan(Base):
    __tablename__ = "fee_installment_plans"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), unique=True, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    invoice = relationship("Invoice", back_populates="installment_plan")
    milestones = relationship(
        "FeeInstallmentMilestone",
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class FeeInstallmentMilestone(Base):
    __tablename__ = "fee_installment_milestones"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("fee_installment_plans.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(Enum(InstallmentMilestoneStatus), default=InstallmentMilestoneStatus.PENDING, nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0, nullable=False)

    plan = relationship("FeeInstallmentPlan", back_populates="milestones")
