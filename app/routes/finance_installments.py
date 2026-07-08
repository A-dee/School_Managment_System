import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.finance import Invoice, InvoiceStatus, Payment
from app.models.installment import FeeInstallmentMilestone, FeeInstallmentPlan, InstallmentMilestoneStatus
from app.models.parent import Parent, ParentStudent
from app.models.student import Student
from app.models.user import UserRole
from app.utils.auth import get_current_user
from app.utils.rbac import is_admin_or_above
from app.utils.response import success_response

router = APIRouter(prefix="/finance", tags=["Finance Installments"])


class InstallmentMilestoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=0)
    due_date: date


class InstallmentPlanCreate(BaseModel):
    milestones: list[InstallmentMilestoneCreate] = Field(min_length=1)

    @field_validator("milestones")
    @classmethod
    def validate_milestones(cls, value: list[InstallmentMilestoneCreate]) -> list[InstallmentMilestoneCreate]:
        names = [item.name.strip().lower() for item in value]
        if len(names) != len(set(names)):
            raise ValueError("Milestone names must be unique per plan")
        return value


class InstallmentMilestonePayment(BaseModel):
    amount_paid: Decimal = Field(gt=0)
    payment_method: str = Field(default="INSTALLMENT", min_length=1, max_length=50)
    receipt_number: Optional[str] = Field(default=None, max_length=100)
    payment_date: date = Field(default_factory=date.today)


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _serialize_milestone(milestone: FeeInstallmentMilestone) -> dict:
    return {
        "id": milestone.id,
        "plan_id": milestone.plan_id,
        "name": milestone.name,
        "amount": milestone.amount,
        "due_date": milestone.due_date,
        "status": milestone.status,
        "paid_amount": milestone.paid_amount,
        "balance": _money(milestone.amount) - _money(milestone.paid_amount),
    }


def _serialize_plan(plan: FeeInstallmentPlan) -> dict:
    return {
        "id": plan.id,
        "invoice_id": plan.invoice_id,
        "total_amount": plan.total_amount,
        "is_active": plan.is_active,
        "milestones": [_serialize_milestone(milestone) for milestone in plan.milestones],
    }


def _assert_user_can_access_invoice(db: Session, current_user, invoice: Invoice) -> None:
    if current_user.role in {UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN}:
        return
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.id == invoice.student_id, Student.user_id == current_user.id).first()
        if student:
            return
        raise HTTPException(status_code=403, detail="You can only access your own invoices")
    if current_user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == invoice.student_id,
        ).first()
        if link:
            return
        raise HTTPException(status_code=403, detail="Not your child's invoice")
    raise HTTPException(status_code=403, detail="You are not allowed to access this invoice")


def _sync_invoice_status(invoice: Invoice) -> None:
    invoice.balance = _money(invoice.total_fee) - _money(invoice.paid_amount)
    if invoice.balance <= 0:
        invoice.balance = Decimal("0.00")
        invoice.status = InvoiceStatus.PAID
    elif _money(invoice.paid_amount) > 0:
        invoice.status = InvoiceStatus.PARTIAL
    else:
        invoice.status = InvoiceStatus.UNPAID


@router.post("/invoices/{invoice_id}/installments")
def create_installment_plan(
    invoice_id: int,
    data: InstallmentPlanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    total_amount = sum((_money(item.amount) for item in data.milestones), Decimal("0.00"))
    plan = db.query(FeeInstallmentPlan).filter(FeeInstallmentPlan.invoice_id == invoice_id).first()
    if not plan:
        plan = FeeInstallmentPlan(invoice_id=invoice_id, total_amount=total_amount, is_active=True)
        db.add(plan)
        db.flush()
    else:
        plan.total_amount = total_amount
        plan.is_active = True
        plan.milestones.clear()
        db.flush()

    for item in data.milestones:
        db.add(
            FeeInstallmentMilestone(
                plan_id=plan.id,
                name=item.name,
                amount=_money(item.amount),
                due_date=item.due_date,
                status=InstallmentMilestoneStatus.PENDING,
                paid_amount=Decimal("0.00"),
            )
        )

    invoice.total_fee = total_amount
    if _money(invoice.paid_amount) > total_amount:
        invoice.paid_amount = total_amount
    _sync_invoice_status(invoice)

    db.commit()
    db.refresh(plan)
    return success_response(_serialize_plan(plan), "Installment plan saved")


@router.get("/invoices/{invoice_id}/installments")
def get_installment_plan(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    _assert_user_can_access_invoice(db, current_user, invoice)

    plan = db.query(FeeInstallmentPlan).filter(
        FeeInstallmentPlan.invoice_id == invoice_id,
        FeeInstallmentPlan.is_active == True,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Active installment plan not found")
    return success_response(_serialize_plan(plan))


@router.post("/installments/milestones/{milestone_id}/pay")
def pay_installment_milestone(
    milestone_id: int,
    data: InstallmentMilestonePayment,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    milestone = db.query(FeeInstallmentMilestone).filter(FeeInstallmentMilestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Installment milestone not found")
    invoice = milestone.plan.invoice if milestone.plan else None
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for installment milestone")

    amount_paid = _money(data.amount_paid)
    milestone_balance = _money(milestone.amount) - _money(milestone.paid_amount)
    invoice_balance = _money(invoice.balance)
    if amount_paid > milestone_balance:
        raise HTTPException(status_code=400, detail="Payment amount exceeds milestone balance")
    if amount_paid > invoice_balance:
        raise HTTPException(status_code=400, detail="Payment amount exceeds invoice balance")

    receipt_number = data.receipt_number or f"INST-{milestone.id}-{uuid.uuid4().hex[:8].upper()}"
    existing_receipt = db.query(Payment).filter(Payment.receipt_number == receipt_number).first()
    if existing_receipt:
        raise HTTPException(status_code=400, detail="Receipt number already exists")

    payment = Payment(
        invoice_id=invoice.id,
        amount_paid=amount_paid,
        payment_method=data.payment_method,
        receipt_number=receipt_number,
        recorded_by_admin_id=current_user.id,
        payment_date=data.payment_date,
    )
    db.add(payment)

    milestone.paid_amount = _money(milestone.paid_amount) + amount_paid
    milestone.status = (
        InstallmentMilestoneStatus.PAID
        if _money(milestone.paid_amount) >= _money(milestone.amount)
        else InstallmentMilestoneStatus.PENDING
    )
    invoice.paid_amount = _money(invoice.paid_amount) + amount_paid
    _sync_invoice_status(invoice)

    db.commit()
    db.refresh(milestone)
    db.refresh(payment)
    return success_response(
        {
            "milestone": _serialize_milestone(milestone),
            "payment_id": payment.id,
            "invoice_id": invoice.id,
            "invoice_status": invoice.status,
            "invoice_balance": invoice.balance,
        },
        "Installment payment recorded",
    )