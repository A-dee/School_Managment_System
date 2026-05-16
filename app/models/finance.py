import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, Numeric, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class InvoiceStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"


class ExpenseApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class PayrollStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"


class PaymentDeclarationStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class PaystackTransactionStatus(str, enum.Enum):
    INITIALIZED = "INITIALIZED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False)
    fee_breakdown = Column(JSON, nullable=False)  # {"tuition": 50000, "books": 5000, ...}
    total_fee = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    class_ = relationship("Class", back_populates="fee_structures")
    session = relationship("AcademicSession", back_populates="fee_structures")
    term = relationship("Term", back_populates="fee_structures")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False)
    total_fee = Column(Numeric(12, 2), nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0)
    balance = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.UNPAID)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="invoices")
    class_ = relationship("Class", back_populates="invoices")
    session = relationship("AcademicSession", back_populates="invoices")
    term = relationship("Term", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String, nullable=False)  # cash, transfer, cheque
    receipt_number = Column(String, unique=True, nullable=False)
    proof_file_url = Column(String, nullable=True)
    recorded_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")
    recorded_by = relationship("User")
    paystack_transactions = relationship("PaystackTransaction", back_populates="payment")


class Expenditure(Base):
    __tablename__ = "expenditures"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    category = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    recorded_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approval_status = Column(Enum(ExpenseApprovalStatus), default=ExpenseApprovalStatus.PENDING)
    approved_by_principal_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    recorded_by = relationship("User", foreign_keys=[recorded_by_admin_id])
    approved_by = relationship("User", foreign_keys=[approved_by_principal_id])


class Payroll(Base):
    __tablename__ = "payrolls"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)
    salary_amount = Column(Numeric(12, 2), nullable=False)
    deductions = Column(Numeric(12, 2), default=0)
    bonuses = Column(Numeric(12, 2), default=0)
    net_salary = Column(Numeric(12, 2), nullable=False)
    payment_status = Column(Enum(PayrollStatus), default=PayrollStatus.PENDING)
    payment_date = Column(Date, nullable=True)
    processed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    staff = relationship("Staff", back_populates="payrolls")
    processed_by = relationship("User")


class PaymentDeclaration(Base):
    __tablename__ = "payment_declarations"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    declared_amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String, default="BANK_TRANSFER")
    reference = Column(String, nullable=True)
    note = Column(String, nullable=True)
    declared_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    declared_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(PaymentDeclarationStatus), default=PaymentDeclarationStatus.PENDING)
    confirmed_amount = Column(Numeric(12, 2), nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice")
    declarer = relationship("User", foreign_keys=[declared_by])
    confirmer = relationship("User", foreign_keys=[confirmed_by])


class OptionalFee(Base):
    __tablename__ = "optional_fees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)   # "After School" | "Clubs"
    amount = Column(Numeric(12, 2), nullable=False)
    billing_period = Column(String, nullable=False, default="termly")  # "monthly" | "termly"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaystackTransaction(Base):
    __tablename__ = "paystack_transactions"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    initiated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    reference = Column(String, unique=True, nullable=False, index=True)
    authorization_url = Column(String, nullable=True)
    access_code = Column(String, nullable=True)
    amount_minor = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="NGN")
    status = Column(Enum(PaystackTransactionStatus), default=PaystackTransactionStatus.INITIALIZED)
    gateway_response = Column(String, nullable=True)
    paystack_transaction_id = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    raw_initialize_response = Column(JSON, nullable=True)
    raw_verify_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    invoice = relationship("Invoice")
    student = relationship("Student")
    initiated_by = relationship("User", foreign_keys=[initiated_by_user_id])
    payment = relationship("Payment", back_populates="paystack_transactions")
