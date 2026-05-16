from typing import Optional, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.models.finance import InvoiceStatus, ExpenseApprovalStatus, PayrollStatus, PaymentDeclarationStatus, PaystackTransactionStatus

_VALID_PAYMENT_METHODS = {"cash", "bank_transfer", "pos", "online", "cheque",
                          "CASH", "BANK_TRANSFER", "POS", "ONLINE", "CHEQUE"}
_VALID_BILLING_PERIODS = {"termly", "monthly"}
_VALID_OPT_CATEGORIES  = {"After School", "Clubs"}


class FeeStructureCreate(BaseModel):
    class_id:      int = Field(gt=0)
    session_id:    int = Field(gt=0)
    term_id:       int = Field(gt=0)
    fee_breakdown: dict[str, Any]
    total_fee:     Decimal = Field(gt=0)

    @field_validator("fee_breakdown")
    @classmethod
    def validate_breakdown(cls, v: dict) -> dict:
        if not v:
            raise ValueError("fee_breakdown must not be empty")
        for key, val in v.items():
            if not isinstance(key, str) or len(key) > 200:
                raise ValueError("fee_breakdown keys must be strings ≤ 200 chars")
            if not isinstance(val, (int, float, Decimal)) or float(val) < 0:
                raise ValueError("fee_breakdown values must be non-negative numbers")
        return v


class FeeStructureOut(BaseModel):
    id:            int
    class_id:      int
    session_id:    int
    term_id:       int
    fee_breakdown: dict
    total_fee:     Decimal
    created_at:    datetime

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    id:          int
    student_id:  int
    class_id:    int
    session_id:  int
    term_id:     int
    total_fee:   Decimal
    paid_amount: Decimal
    balance:     Decimal
    status:      InvoiceStatus
    due_date:    Optional[date]
    created_at:  datetime

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    invoice_id:     int = Field(gt=0)
    amount_paid:    Decimal = Field(gt=0)
    payment_method: str = Field(min_length=1, max_length=50)
    receipt_number: str = Field(min_length=1, max_length=100)
    proof_file_url: Optional[str] = Field(None, max_length=500)
    payment_date:   date

    @field_validator("payment_method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        if v not in _VALID_PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of: {', '.join(sorted(_VALID_PAYMENT_METHODS))}")
        return v


class PaymentOut(BaseModel):
    id:                  int
    invoice_id:          int
    amount_paid:         Decimal
    payment_method:      str
    receipt_number:      str
    proof_file_url:      Optional[str]
    recorded_by_admin_id: int
    payment_date:        date
    created_at:          datetime

    class Config:
        from_attributes = True


class ExpenditureCreate(BaseModel):
    title:       str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    amount:      Decimal = Field(gt=0)
    category:    str = Field(min_length=1, max_length=100)
    date:        date


class ExpenditureOut(BaseModel):
    id:                       int
    title:                    str
    description:              Optional[str]
    amount:                   Decimal
    category:                 str
    date:                     date
    recorded_by_admin_id:     int
    approval_status:          ExpenseApprovalStatus
    approved_by_principal_id: Optional[int]
    created_at:               datetime

    class Config:
        from_attributes = True


class PayrollCreate(BaseModel):
    staff_id:   int = Field(gt=0)
    month:      int = Field(ge=1, le=12)
    year:       int = Field(ge=2000, le=2100)
    deductions: Decimal = Field(default=Decimal("0"), ge=0)
    bonuses:    Decimal = Field(default=Decimal("0"), ge=0)


class PayrollOut(BaseModel):
    id:             int
    staff_id:       int
    month:          int
    year:           int
    salary_amount:  Decimal
    deductions:     Decimal
    bonuses:        Decimal
    net_salary:     Decimal
    payment_status: PayrollStatus
    payment_date:   Optional[date]
    created_at:     datetime

    class Config:
        from_attributes = True


class GenerateInvoicesRequest(BaseModel):
    session_id: int = Field(gt=0)
    term_id:    int = Field(gt=0)
    due_date:   Optional[date] = None


class PaymentDeclarationIn(BaseModel):
    invoice_id:     int = Field(gt=0)
    declared_amount: Decimal = Field(gt=0)
    payment_method: str = Field(default="BANK_TRANSFER", max_length=50)
    reference:      Optional[str] = Field(None, max_length=200)
    note:           Optional[str] = Field(None, max_length=500)


class PaymentDeclarationConfirm(BaseModel):
    confirmed_amount: Decimal = Field(gt=0)


class PaymentDeclarationReject(BaseModel):
    rejection_reason: Optional[str] = Field(None, max_length=500)


class DirectPaymentCreate(BaseModel):
    student_id:     int = Field(gt=0)
    session_id:     int = Field(gt=0)
    term_id:        int = Field(gt=0)
    class_id:       Optional[int] = Field(None, gt=0)
    total_fee:      Decimal = Field(gt=0)
    amount_paid:    Decimal = Field(gt=0)
    payment_method: str = Field(min_length=1, max_length=50)
    receipt_number: str = Field(min_length=1, max_length=100)
    payment_date:   date

    @field_validator("payment_method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        if v not in _VALID_PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of: {', '.join(sorted(_VALID_PAYMENT_METHODS))}")
        return v


class PaymentDeclarationOut(BaseModel):
    id:               int
    invoice_id:       int
    declared_amount:  Decimal
    payment_method:   str
    reference:        Optional[str]
    note:             Optional[str]
    declared_by:      int
    declared_at:      datetime
    status:           PaymentDeclarationStatus
    confirmed_amount: Optional[Decimal]
    confirmed_by:     Optional[int]
    confirmed_at:     Optional[datetime]
    rejection_reason: Optional[str]
    created_at:       datetime

    class Config:
        from_attributes = True


class OptionalFeeCreate(BaseModel):
    name:           str = Field(min_length=1, max_length=200)
    category:       str = Field(min_length=1, max_length=100)
    amount:         Decimal = Field(gt=0)
    billing_period: str = Field(default="termly", max_length=20)
    description:    Optional[str] = Field(None, max_length=500)

    @field_validator("billing_period")
    @classmethod
    def validate_billing_period(cls, v: str) -> str:
        if v not in _VALID_BILLING_PERIODS:
            raise ValueError("billing_period must be 'termly' or 'monthly'")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in _VALID_OPT_CATEGORIES:
            raise ValueError("category must be 'After School' or 'Clubs'")
        return v


class OptionalFeeUpdate(BaseModel):
    name:           Optional[str] = Field(None, min_length=1, max_length=200)
    category:       Optional[str] = Field(None, max_length=100)
    amount:         Optional[Decimal] = Field(None, gt=0)
    billing_period: Optional[str] = Field(None, max_length=20)
    description:    Optional[str] = Field(None, max_length=500)
    is_active:      Optional[bool] = None

    @field_validator("billing_period")
    @classmethod
    def validate_billing_period(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_BILLING_PERIODS:
            raise ValueError("billing_period must be 'termly' or 'monthly'")
        return v


class OptionalFeeOut(BaseModel):
    id:             int
    name:           str
    category:       str
    amount:         Decimal
    billing_period: str
    description:    Optional[str]
    is_active:      bool
    created_at:     datetime

    class Config:
        from_attributes = True


class PaystackInitializeIn(BaseModel):
    invoice_id: int = Field(gt=0)


class PaystackInitializeOut(BaseModel):
    reference: str
    authorization_url: str
    access_code: str
    invoice_id: int
    amount_minor: int
    currency: str


class PaystackTransactionOut(BaseModel):
    id: int
    invoice_id: int
    student_id: int
    initiated_by_user_id: int
    payment_id: Optional[int]
    reference: str
    authorization_url: Optional[str]
    access_code: Optional[str]
    amount_minor: int
    currency: str
    status: PaystackTransactionStatus
    gateway_response: Optional[str]
    paystack_transaction_id: Optional[str]
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
