from typing import Optional, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models.finance import InvoiceStatus, ExpenseApprovalStatus, PayrollStatus, PaymentDeclarationStatus



class FeeStructureCreate(BaseModel):
    class_id: int
    session_id: int
    term_id: int
    fee_breakdown: dict[str, Any]
    total_fee: Decimal


class FeeStructureOut(BaseModel):
    id: int
    class_id: int
    session_id: int
    term_id: int
    fee_breakdown: dict
    total_fee: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    id: int
    student_id: int
    class_id: int
    session_id: int
    term_id: int
    total_fee: Decimal
    paid_amount: Decimal
    balance: Decimal
    status: InvoiceStatus
    due_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    invoice_id: int
    amount_paid: Decimal
    payment_method: str
    receipt_number: str
    proof_file_url: Optional[str] = None
    payment_date: date


class PaymentOut(BaseModel):
    id: int
    invoice_id: int
    amount_paid: Decimal
    payment_method: str
    receipt_number: str
    proof_file_url: Optional[str]
    recorded_by_admin_id: int
    payment_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenditureCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: Decimal
    category: str
    date: date


class ExpenditureOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    amount: Decimal
    category: str
    date: date
    recorded_by_admin_id: int
    approval_status: ExpenseApprovalStatus
    approved_by_principal_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class PayrollCreate(BaseModel):
    staff_id: int
    month: int
    year: int
    deductions: Decimal = Decimal("0")
    bonuses: Decimal = Decimal("0")


class PayrollOut(BaseModel):
    id: int
    staff_id: int
    month: int
    year: int
    salary_amount: Decimal
    deductions: Decimal
    bonuses: Decimal
    net_salary: Decimal
    payment_status: PayrollStatus
    payment_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateInvoicesRequest(BaseModel):
    session_id: int
    term_id: int
    due_date: Optional[date] = None


class PaymentDeclarationIn(BaseModel):
    invoice_id: int
    declared_amount: Decimal
    payment_method: str = "BANK_TRANSFER"
    reference: Optional[str] = None
    note: Optional[str] = None


class PaymentDeclarationConfirm(BaseModel):
    confirmed_amount: Decimal


class PaymentDeclarationReject(BaseModel):
    rejection_reason: Optional[str] = None


class DirectPaymentCreate(BaseModel):
    student_id: int
    session_id: int
    term_id: int
    class_id: Optional[int] = None
    total_fee: Decimal
    amount_paid: Decimal
    payment_method: str
    receipt_number: str
    payment_date: date


class PaymentDeclarationOut(BaseModel):
    id: int
    invoice_id: int
    declared_amount: Decimal
    payment_method: str
    reference: Optional[str]
    note: Optional[str]
    declared_by: int
    declared_at: datetime
    status: PaymentDeclarationStatus
    confirmed_amount: Optional[Decimal]
    confirmed_by: Optional[int]
    confirmed_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class OptionalFeeCreate(BaseModel):
    name: str
    category: str
    amount: Decimal
    billing_period: str = "termly"
    description: Optional[str] = None


class OptionalFeeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    billing_period: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class OptionalFeeOut(BaseModel):
    id: int
    name: str
    category: str
    amount: Decimal
    billing_period: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
