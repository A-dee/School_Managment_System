from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.finance import FeeStructure, Invoice, Payment, Expenditure, Payroll, InvoiceStatus, ExpenseApprovalStatus, PayrollStatus, OptionalFee, PaystackTransaction, PaystackTransactionStatus
from app.models.student import Student, StudentStatus


def create_fee_structure(db: Session, data) -> FeeStructure:
    fs = FeeStructure(**data.model_dump())
    db.add(fs)
    db.flush()
    return fs


def get_fee_structure(db: Session, class_id: int, session_id: int, term_id: int) -> Optional[FeeStructure]:
    return db.query(FeeStructure).filter(
        FeeStructure.class_id == class_id,
        FeeStructure.session_id == session_id,
        FeeStructure.term_id == term_id,
    ).first()


def generate_invoices_for_term(db: Session, session_id: int, term_id: int, due_date=None) -> int:
    """Auto-generate invoices for all active students based on fee structure."""
    students = db.query(Student).filter(Student.status == StudentStatus.ACTIVE).all()
    count = 0
    for student in students:
        if not student.current_class_id:
            continue
        fs = get_fee_structure(db, student.current_class_id, session_id, term_id)
        if not fs:
            continue
        existing = db.query(Invoice).filter(
            Invoice.student_id == student.id,
            Invoice.session_id == session_id,
            Invoice.term_id == term_id,
        ).first()
        if existing:
            continue
        scholarship = getattr(student, 'scholarship_percentage', 0) or 0
        discount = Decimal(str(fs.total_fee)) * Decimal(scholarship) / Decimal("100")
        payable = Decimal(str(fs.total_fee)) - discount
        invoice = Invoice(
            student_id=student.id,
            class_id=student.current_class_id,
            session_id=session_id,
            term_id=term_id,
            total_fee=payable,
            paid_amount=Decimal("0"),
            balance=payable,
            status=InvoiceStatus.UNPAID,
            due_date=due_date,
        )
        db.add(invoice)
        count += 1
    db.flush()
    return count


def get_invoice(db: Session, invoice_id: int) -> Optional[Invoice]:
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()


def get_student_invoices(db: Session, student_id: int):
    return db.query(Invoice).filter(Invoice.student_id == student_id).all()


def get_paystack_transaction_by_reference(db: Session, reference: str) -> Optional[PaystackTransaction]:
    return db.query(PaystackTransaction).filter(PaystackTransaction.reference == reference).first()


def list_paystack_transactions(
    db: Session,
    *,
    status: Optional[PaystackTransactionStatus] = None,
    invoice_id: Optional[int] = None,
    student_id: Optional[int] = None,
    initiated_by_user_id: Optional[int] = None,
    student_ids: Optional[list[int]] = None,
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(PaystackTransaction)
    if status:
        query = query.filter(PaystackTransaction.status == status)
    if invoice_id:
        query = query.filter(PaystackTransaction.invoice_id == invoice_id)
    if student_id:
        query = query.filter(PaystackTransaction.student_id == student_id)
    if initiated_by_user_id:
        query = query.filter(PaystackTransaction.initiated_by_user_id == initiated_by_user_id)
    if student_ids:
        query = query.filter(PaystackTransaction.student_id.in_(student_ids))
    total = query.count()
    rows = (
        query.order_by(PaystackTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return rows, total


def record_payment(db: Session, data, admin_user_id: int) -> Payment:
    invoice = get_invoice(db, data.invoice_id)
    if not invoice:
        raise ValueError("Invoice not found")
    amount_paid = Decimal(str(data.amount_paid)).quantize(Decimal("0.01"))
    balance = Decimal(str(invoice.balance or 0)).quantize(Decimal("0.01"))
    if amount_paid <= 0:
        raise ValueError("Payment amount must be greater than zero")
    if balance <= 0 or invoice.status == InvoiceStatus.PAID:
        raise ValueError("Invoice has already been fully paid")
    if amount_paid > balance:
        raise ValueError("Payment amount cannot exceed the invoice balance")
    existing_receipt = db.query(Payment).filter(Payment.receipt_number == data.receipt_number).first()
    if existing_receipt:
        raise ValueError("Receipt number already exists")

    payment = Payment(
        invoice_id=data.invoice_id,
        amount_paid=amount_paid,
        payment_method=data.payment_method,
        receipt_number=data.receipt_number,
        proof_file_url=data.proof_file_url,
        recorded_by_admin_id=admin_user_id,
        payment_date=data.payment_date,
    )
    db.add(payment)

    invoice.paid_amount = (invoice.paid_amount or Decimal("0")) + amount_paid
    invoice.balance = Decimal(str(invoice.total_fee)) - Decimal(str(invoice.paid_amount))
    if invoice.balance <= 0:
        invoice.status = InvoiceStatus.PAID
        invoice.balance = Decimal("0")
    else:
        invoice.status = InvoiceStatus.PARTIAL
    db.flush()
    return payment


def get_debtors(db: Session, session_id: int, term_id: int):
    return db.query(Invoice).filter(
        Invoice.session_id == session_id,
        Invoice.term_id == term_id,
        Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL]),
    ).all()


def create_expenditure(db: Session, data, admin_user_id: int) -> Expenditure:
    expense = Expenditure(
        **data.model_dump(),
        recorded_by_admin_id=admin_user_id,
        approval_status=ExpenseApprovalStatus.PENDING,
    )
    db.add(expense)
    db.flush()
    return expense


def approve_expenditure(db: Session, expense: Expenditure, principal_user_id: int) -> Expenditure:
    expense.approval_status = ExpenseApprovalStatus.APPROVED
    expense.approved_by_principal_id = principal_user_id
    expense.approved_at = datetime.utcnow()
    db.flush()
    return expense


def reject_expenditure(db: Session, expense: Expenditure, principal_user_id: int) -> Expenditure:
    expense.approval_status = ExpenseApprovalStatus.REJECTED
    expense.approved_by_principal_id = principal_user_id
    db.flush()
    return expense


def create_payroll(db: Session, data, processed_by_id: int) -> Payroll:
    from app.models.staff import Staff
    staff = db.query(Staff).filter(Staff.id == data.staff_id).first()
    if not staff:
        raise ValueError("Staff not found")
    net = staff.salary_amount + data.bonuses - data.deductions
    payroll = Payroll(
        staff_id=data.staff_id,
        month=data.month,
        year=data.year,
        salary_amount=staff.salary_amount,
        deductions=data.deductions,
        bonuses=data.bonuses,
        net_salary=net,
        payment_status=PayrollStatus.PENDING,
        processed_by_id=processed_by_id,
    )
    db.add(payroll)
    db.flush()
    return payroll


def mark_payroll_paid(db: Session, payroll: Payroll, payment_date) -> Payroll:
    payroll.payment_status = PayrollStatus.PAID
    payroll.payment_date = payment_date
    db.flush()
    return payroll


def get_profit_loss(db: Session, session_id: Optional[int] = None, term_id: Optional[int] = None,
                    month: Optional[int] = None, year: Optional[int] = None) -> dict:
    from sqlalchemy import extract

    income_q = db.query(func.sum(Payment.amount_paid))
    expense_q = db.query(func.sum(Expenditure.amount)).filter(
        Expenditure.approval_status == ExpenseApprovalStatus.APPROVED
    )
    salary_q = db.query(func.sum(Payroll.net_salary)).filter(
        Payroll.payment_status == PayrollStatus.PAID
    )

    if session_id:
        income_q = income_q.join(Invoice).filter(Invoice.session_id == session_id)
    if term_id:
        income_q = income_q.join(Invoice).filter(Invoice.term_id == term_id)

    if month and year:
        income_q  = income_q.filter(extract("month", Payment.payment_date) == month,
                                    extract("year",  Payment.payment_date) == year)
        expense_q = expense_q.filter(extract("month", Expenditure.date) == month,
                                     extract("year",  Expenditure.date) == year)
        salary_q  = salary_q.filter(extract("month", Payroll.payment_date) == month,
                                    extract("year",  Payroll.payment_date) == year)

    total_income    = float(income_q.scalar() or 0)
    total_expenses  = float(expense_q.scalar() or 0)
    total_salaries  = float(salary_q.scalar() or 0)
    total_outgoings = total_expenses + total_salaries
    profit  = total_income - total_outgoings
    margin  = (profit / total_income * 100) if total_income > 0 else 0

    return {
        "total_income":           total_income,
        "total_expenses":         total_expenses,
        "total_salaries":         total_salaries,
        "total_outgoings":        total_outgoings,
        "profit":                 profit,
        "profit_margin_percent":  round(margin, 2),
    }


# ── Optional Fees ──────────────────────────────────────────────────────────────

def list_optional_fees(db: Session):
    return db.query(OptionalFee).order_by(OptionalFee.category, OptionalFee.name).all()

def create_optional_fee(db: Session, data) -> OptionalFee:
    fee = OptionalFee(**data.model_dump())
    db.add(fee)
    db.flush()
    return fee

def update_optional_fee(db: Session, fee_id: int, data) -> Optional[OptionalFee]:
    fee = db.query(OptionalFee).filter(OptionalFee.id == fee_id).first()
    if not fee:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(fee, k, v)
    db.flush()
    return fee

def delete_optional_fee(db: Session, fee_id: int) -> bool:
    fee = db.query(OptionalFee).filter(OptionalFee.id == fee_id).first()
    if not fee:
        return False
    db.delete(fee)
    db.flush()
    return True
