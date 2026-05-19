import os
import uuid
from typing import Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.finance import FeeStructure, Invoice, Payment, Expenditure, Payroll, PaymentDeclaration, PaymentDeclarationStatus, InvoiceStatus, PaystackTransaction, PaystackTransactionStatus
from app.schemas.finance import (
    FeeStructureCreate, FeeStructureOut, InvoiceOut,
    PaymentCreate, PaymentOut, ExpenditureCreate, ExpenditureOut,
    PayrollCreate, PayrollOut, GenerateInvoicesRequest,
    PaymentDeclarationIn, PaymentDeclarationOut,
    PaymentDeclarationConfirm, PaymentDeclarationReject,
    DirectPaymentCreate,
    OptionalFeeCreate, OptionalFeeUpdate, OptionalFeeOut,
    PaystackInitializeIn, PaystackInitializeOut, PaystackTransactionListItem, PaystackTransactionOut,
)
from app.crud.finance import (
    create_fee_structure, generate_invoices_for_term, get_invoice,
    get_student_invoices, record_payment, get_debtors,
    create_expenditure, approve_expenditure, reject_expenditure,
    create_payroll, mark_payroll_paid, get_profit_loss,
    list_optional_fees, create_optional_fee, update_optional_fee, delete_optional_fee,
    get_paystack_transaction_by_reference, list_paystack_transactions,
)
from app.utils.rbac import is_principal_or_above, is_admin_or_above, is_vp_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response, paginated_response
from app.utils.audit import log_action
from app.config import settings
from app.models.user import UserRole
from app.crud.staff import get_staff_by_user_id
from app.routes.notifications import send_bulk_notifications
from app.utils.paystack import (
    initialize_paystack_transaction, verify_paystack_signature,
    verify_paystack_transaction, paystack_is_configured,
)
from app.utils.student_portal import student_requires_parent_portal

router = APIRouter(prefix="/finance", tags=["Finance"])


def _assert_teacher_can_access_student_finance(db: Session, current_user, student_id: int):
    if current_user.role != UserRole.TEACHER:
        return
    from app.models.student import Student
    from app.models.class_ import Class
    staff = get_staff_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(status_code=403, detail="Staff profile not found")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    cls = db.query(Class).filter(Class.id == student.current_class_id, Class.class_teacher_id == staff.id).first()
    if not cls:
        raise HTTPException(status_code=403, detail="You can only access finance records for students in your own class")


def _get_student_finance_recipient_ids(db: Session, student_id: int) -> set[int]:
    from app.models.student import Student
    from app.models.parent import ParentStudent, Parent

    recipient_ids: set[int] = set()
    student = db.query(Student).filter(Student.id == student_id).first()
    if student and student.user_id:
        recipient_ids.add(student.user_id)

    links = db.query(ParentStudent).filter(ParentStudent.student_id == student_id).all()
    if links:
        parents = db.query(Parent).filter(Parent.id.in_([link.parent_id for link in links])).all()
        recipient_ids.update(parent.user_id for parent in parents if parent.user_id)
    return recipient_ids


def _get_management_finance_recipient_ids(db: Session) -> set[int]:
    from app.models.user import User

    managers = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN])).all()
    return {user.id for user in managers if user.is_active}


def _assert_user_can_access_invoice(db: Session, current_user, invoice: Invoice):
    # Paystack routes, manual declarations, and invoice views all rely on this
    # shared guard so role checks stay consistent across finance entry points.
    if current_user.role in {UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN}:
        return
    if current_user.role == UserRole.STUDENT:
        from app.models.student import Student
        student = db.query(Student).filter(Student.id == invoice.student_id, Student.user_id == current_user.id).first()
        if student:
            return
        raise HTTPException(status_code=403, detail="You can only access your own invoices")
    if current_user.role == UserRole.PARENT:
        from app.models.parent import Parent, ParentStudent
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


def _get_paystack_callback_path(current_user) -> str:
    # Send the payer back to the fees page that can immediately refresh their balance.
    if current_user.role == UserRole.PARENT:
        return "/parent/fees"
    if current_user.role == UserRole.STUDENT:
        return "/student/fees"
    return "/principal/finance"


def _minor_units(amount: Decimal) -> int:
    # Paystack amounts are sent in Kobo, so NGN 5000.00 becomes 500000.
    return int((Decimal(str(amount)) * 100).quantize(Decimal("1")))


def _rounded_money(amount: Decimal) -> Decimal:
    return Decimal(str(amount)).quantize(Decimal("0.01"))


def _allowed_parent_payment_amounts(invoice: Invoice) -> dict[int, Decimal]:
    total_fee = _rounded_money(Decimal(str(invoice.total_fee or 0)))
    balance = _rounded_money(Decimal(str(invoice.balance or 0)))
    paid_amount = _rounded_money(Decimal(str(invoice.paid_amount or 0)))
    allowed: dict[int, Decimal] = {}
    if balance <= 0:
        return allowed
    # The parent-facing schedule is intentionally simple: an unpaid invoice can
    # be settled at 50% now or in full, while a partially paid invoice must be
    # cleared with the remaining 100% balance.
    if paid_amount <= 0:
        half = _rounded_money(total_fee * Decimal("0.50"))
        if half > 0:
            allowed[50] = half
    allowed[100] = balance
    return allowed


def _resolve_parent_payment_amount(invoice: Invoice, payment_option: Optional[int]) -> Decimal:
    allowed = _allowed_parent_payment_amounts(invoice)
    option = payment_option or 100
    if option not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Only 50% and 100% payment options are allowed for this invoice.",
        )
    return allowed[option]


def _assert_parent_declared_amount_matches_schedule(invoice: Invoice, declared_amount: Decimal, payment_option: Optional[int]):
    expected_amount = _resolve_parent_payment_amount(invoice, payment_option)
    if _rounded_money(declared_amount) != expected_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Declared amount must match the allowed schedule amount of NGN {expected_amount:,.2f}.",
        )


def _sync_paystack_transaction(db: Session, transaction: PaystackTransaction, verify_response: dict):
    data = verify_response.get("data") or {}
    status = data.get("status")
    transaction.raw_verify_response = verify_response
    transaction.gateway_response = data.get("gateway_response")
    transaction.paystack_transaction_id = str(data.get("id")) if data.get("id") is not None else None

    if data.get("paid_at"):
        from datetime import datetime as dt
        try:
            transaction.paid_at = dt.fromisoformat(str(data["paid_at"]).replace("Z", "+00:00"))
        except ValueError:
            transaction.paid_at = None

    if status == "success":
        transaction.status = PaystackTransactionStatus.SUCCESS
        if transaction.payment_id is None:
            # Only create one internal payment per Paystack reference even if verify/webhook run more than once.
            amount_paid = Decimal(str(data.get("amount", 0))) / Decimal("100")
            payment_date = transaction.paid_at.date() if transaction.paid_at else date.today()
            try:
                payment = record_payment(
                    db,
                    PaymentCreate(
                        invoice_id=transaction.invoice_id,
                        amount_paid=amount_paid,
                        payment_method="ONLINE",
                        receipt_number=transaction.reference,
                        payment_date=payment_date,
                    ),
                    transaction.initiated_by_user_id,
                )
                transaction.payment_id = payment.id
            except ValueError:
                # A successful provider transaction may arrive after an admin has
                # already settled the invoice; keep the gateway audit row without
                # forcing a duplicate internal payment.
                payment = None
            send_bulk_notifications(
                db,
                _get_student_finance_recipient_ids(db, transaction.student_id),
                "Paystack payment confirmed",
                f"An online payment of NGN {amount_paid:,.2f} has been confirmed for your school fees.",
            )
            student_name = f"{transaction.student.first_name} {transaction.student.last_name}".strip() if transaction.student else f"Student #{transaction.student_id}"
            send_bulk_notifications(
                db,
                _get_management_finance_recipient_ids(db),
                "Online school fees payment received",
                f"{student_name} completed an online school fees payment of NGN {amount_paid:,.2f}.",
            )
    elif status in {"failed", "reversed"}:
        transaction.status = PaystackTransactionStatus.FAILED
    else:
        transaction.status = PaystackTransactionStatus.PENDING


def _serialize_paystack_transaction(transaction: PaystackTransaction) -> dict:
    return PaystackTransactionOut.model_validate(transaction).model_dump()


def _serialize_paystack_transaction_list_item(transaction: PaystackTransaction) -> dict:
    student_name = None
    if transaction.student:
        student_name = f"{transaction.student.first_name} {transaction.student.last_name}".strip()
    return PaystackTransactionListItem(
        **PaystackTransactionOut.model_validate(transaction).model_dump(),
        invoice_status=transaction.invoice.status if transaction.invoice else None,
        invoice_balance=transaction.invoice.balance if transaction.invoice else None,
        student_name=student_name,
        initiated_by_email=transaction.initiated_by.email if transaction.initiated_by else None,
    ).model_dump(mode="json")


# --- Fee Structures ---
@router.post("/fee-structures")
def set_fee_structure(data: FeeStructureCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    fs = create_fee_structure(db, data)
    db.commit()
    return success_response(FeeStructureOut.model_validate(fs).model_dump(), "Fee structure created")


@router.get("/fee-structures")
def list_fee_structures(db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    structures = db.query(FeeStructure).all()
    return success_response([FeeStructureOut.model_validate(s).model_dump() for s in structures])


@router.put("/fee-structures/{fs_id}")
def update_fee_structure(
    fs_id: int, data: FeeStructureCreate,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    fs = db.query(FeeStructure).filter(FeeStructure.id == fs_id).first()
    if not fs:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    fs.class_id = data.class_id
    fs.session_id = data.session_id
    fs.term_id = data.term_id
    fs.fee_breakdown = data.fee_breakdown
    fs.total_fee = data.total_fee
    db.commit()
    return success_response(FeeStructureOut.model_validate(fs).model_dump(), "Fee structure updated")


@router.delete("/fee-structures/{fs_id}")
def delete_fee_structure(
    fs_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    fs = db.query(FeeStructure).filter(FeeStructure.id == fs_id).first()
    if not fs:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    db.delete(fs)
    db.commit()
    return success_response(None, "Fee structure deleted")


# --- Invoices ---
@router.post("/invoices/generate")
def generate_invoices(data: GenerateInvoicesRequest, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    count = generate_invoices_for_term(db, data.session_id, data.term_id, data.due_date)
    log_action(db, "GENERATE_INVOICES", "Invoice", current_user.id, new_value={"count": count})
    db.commit()
    return success_response({"generated": count}, f"{count} invoices generated")


@router.get("/invoices")
def list_invoices(
    session_id: Optional[int] = None, term_id: Optional[int] = None, status: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    q = db.query(Invoice)
    if session_id:
        q = q.filter(Invoice.session_id == session_id)
    if term_id:
        q = q.filter(Invoice.term_id == term_id)
    if status:
        q = q.filter(Invoice.status == status)
    total = q.count()
    invoices = q.offset(skip).limit(limit).all()
    return paginated_response([InvoiceOut.model_validate(i).model_dump() for i in invoices], total, skip // limit + 1, limit)


@router.get("/invoices/debtors")
def debtors(session_id: int, term_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    debt_invoices = get_debtors(db, session_id, term_id)
    return success_response([InvoiceOut.model_validate(i).model_dump() for i in debt_invoices])


@router.get("/invoices/my")
def my_invoices(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.student import Student
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if student_requires_parent_portal(db, student):
        raise HTTPException(status_code=403, detail="This class uses parent-only fee access")
    invoices = get_student_invoices(db, student.id)
    return success_response([InvoiceOut.model_validate(i).model_dump() for i in invoices])


@router.get("/invoices/student/{student_id}")
def student_invoices(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _assert_teacher_can_access_student_finance(db, current_user, student_id)
    if current_user.role == UserRole.STUDENT:
        from app.models.student import Student
        student = db.query(Student).filter(Student.id == student_id, Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=403, detail="You can only access your own invoices")
        if student_requires_parent_portal(db, student):
            raise HTTPException(status_code=403, detail="This class uses parent-only fee access")
    if current_user.role == UserRole.PARENT:
        from app.models.parent import Parent, ParentStudent
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Not a parent")
        from app.models.parent import ParentStudent
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student_id
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Not your child")
    invoices = get_student_invoices(db, student_id)
    return success_response([InvoiceOut.model_validate(i).model_dump() for i in invoices])


# --- Payments ---
@router.post("/payments")
def add_payment(data: PaymentCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    try:
        payment = record_payment(db, data, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if invoice:
        send_bulk_notifications(
            db,
            _get_student_finance_recipient_ids(db, invoice.student_id),
            "Payment recorded",
            f"A payment of NGN {data.amount_paid:,.2f} has been recorded for your school fees.",
        )
    log_action(db, "RECORD_PAYMENT", "Payment", current_user.id, entity_id=payment.id,
               new_value={"amount": float(data.amount_paid), "invoice_id": data.invoice_id})
    db.commit()
    return success_response(PaymentOut.model_validate(payment).model_dump(), "Payment recorded")


@router.post("/payments/upload-proof/{payment_id}")
async def upload_proof(
    payment_id: int, file: UploadFile = File(...),
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, "receipts", filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(await file.read())
    payment.proof_file_url = filepath
    db.commit()
    return success_response({"file_url": filepath}, "Proof uploaded")


@router.get("/payments")
def list_payments(invoice_id: Optional[int] = None, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    q = db.query(Payment)
    if invoice_id:
        q = q.filter(Payment.invoice_id == invoice_id)
    payments = q.all()
    return success_response([PaymentOut.model_validate(p).model_dump() for p in payments])


# --- Expenditures ---
@router.post("/expenditures")
def add_expenditure(data: ExpenditureCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    expense = create_expenditure(db, data, current_user.id)
    db.commit()
    return success_response(ExpenditureOut.model_validate(expense).model_dump(), "Expenditure recorded")


@router.get("/expenditures")
def list_expenditures(db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    expenses = db.query(Expenditure).all()
    return success_response([ExpenditureOut.model_validate(e).model_dump() for e in expenses])


@router.post("/expenditures/{expense_id}/approve")
def approve_expense(expense_id: int, db: Session = Depends(get_db), current_user=Depends(is_vp_or_above)):
    expense = db.query(Expenditure).filter(Expenditure.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    approve_expenditure(db, expense, current_user.id)
    log_action(db, "APPROVE_EXPENSE", "Expenditure", current_user.id, entity_id=expense_id)
    db.commit()
    return success_response(None, "Expenditure approved")


@router.post("/expenditures/{expense_id}/reject")
def reject_expense(expense_id: int, db: Session = Depends(get_db), current_user=Depends(is_vp_or_above)):
    expense = db.query(Expenditure).filter(Expenditure.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    reject_expenditure(db, expense, current_user.id)
    log_action(db, "REJECT_EXPENSE", "Expenditure", current_user.id, entity_id=expense_id)
    db.commit()
    return success_response(None, "Expenditure rejected")


# --- Payroll ---
@router.post("/payroll")
def process_payroll(data: PayrollCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    payroll = create_payroll(db, data, current_user.id)
    db.commit()
    return success_response(PayrollOut.model_validate(payroll).model_dump(), "Payroll created")


@router.post("/payroll/{payroll_id}/mark-paid")
def mark_paid(payroll_id: int, payment_date: date, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    mark_payroll_paid(db, payroll, payment_date)
    db.commit()
    return success_response(None, "Payroll marked as paid")


@router.get("/payroll")
def list_payroll(
    staff_id: Optional[int] = None, month: Optional[int] = None, year: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    q = db.query(Payroll)
    if staff_id:
        q = q.filter(Payroll.staff_id == staff_id)
    if month:
        q = q.filter(Payroll.month == month)
    if year:
        q = q.filter(Payroll.year == year)
    payrolls = q.all()
    return success_response([PayrollOut.model_validate(p).model_dump() for p in payrolls])


# --- Payment Declarations (parent self-reporting) ---

@router.post("/payment-declarations")
def declare_payment(data: PaymentDeclarationIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.user import UserRole
    from app.models.parent import Parent, ParentStudent
    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if current_user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == invoice.student_id
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Not your child's invoice")
        _assert_parent_declared_amount_matches_schedule(invoice, data.declared_amount, data.payment_option)
    decl = PaymentDeclaration(
        invoice_id=data.invoice_id,
        declared_amount=data.declared_amount,
        payment_method=data.payment_method,
        reference=data.reference,
        note=data.note,
        declared_by=current_user.id,
    )
    db.add(decl)
    db.commit()
    db.refresh(decl)
    return success_response(PaymentDeclarationOut.model_validate(decl).model_dump(), "Payment declaration submitted")


@router.get("/payment-declarations/my")
def my_declarations(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    decls = db.query(PaymentDeclaration).filter(
        PaymentDeclaration.declared_by == current_user.id
    ).order_by(PaymentDeclaration.created_at.desc()).all()
    return success_response([PaymentDeclarationOut.model_validate(d).model_dump() for d in decls])


@router.get("/payment-declarations")
def list_declarations(
    status: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    q = db.query(PaymentDeclaration)
    if status:
        q = q.filter(PaymentDeclaration.status == status)
    total = q.count()
    decls = q.order_by(PaymentDeclaration.created_at.desc()).offset(skip).limit(limit).all()
    return paginated_response([PaymentDeclarationOut.model_validate(d).model_dump() for d in decls], total, skip // limit + 1, limit)


@router.put("/payment-declarations/{decl_id}/confirm")
def confirm_declaration(
    decl_id: int, data: PaymentDeclarationConfirm,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    from datetime import datetime as dt
    decl = db.query(PaymentDeclaration).filter(PaymentDeclaration.id == decl_id).first()
    if not decl:
        raise HTTPException(status_code=404, detail="Declaration not found")
    if decl.status != PaymentDeclarationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Declaration already processed")
    decl.status = PaymentDeclarationStatus.CONFIRMED
    decl.confirmed_amount = data.confirmed_amount
    decl.confirmed_by = current_user.id
    decl.confirmed_at = dt.utcnow()
    # Create actual payment record
    import uuid
    payment = Payment(
        invoice_id=decl.invoice_id,
        amount_paid=data.confirmed_amount,
        payment_method=decl.payment_method,
        receipt_number=f"DECL-{decl.id}-{uuid.uuid4().hex[:6].upper()}",
        recorded_by_admin_id=current_user.id,
        payment_date=dt.utcnow().date(),
    )
    db.add(payment)
    # Update invoice paid_amount and status
    invoice = db.query(Invoice).filter(Invoice.id == decl.invoice_id).first()
    if invoice:
        from app.models.finance import InvoiceStatus
        invoice.paid_amount = (invoice.paid_amount or 0) + data.confirmed_amount
        invoice.balance = invoice.total_fee - invoice.paid_amount
        if invoice.balance <= 0:
            invoice.status = InvoiceStatus.PAID
            invoice.balance = Decimal("0")
        else:
            invoice.status = InvoiceStatus.PARTIAL
        send_bulk_notifications(
            db,
            _get_student_finance_recipient_ids(db, invoice.student_id),
            "Payment confirmed",
            f"Your payment declaration of NGN {data.confirmed_amount:,.2f} has been confirmed.",
        )
    log_action(db, "CONFIRM_DECLARATION", "PaymentDeclaration", current_user.id,
               entity_id=decl_id, new_value={"confirmed_amount": float(data.confirmed_amount)})
    db.commit()
    return success_response(PaymentDeclarationOut.model_validate(decl).model_dump(), "Payment confirmed")


@router.put("/payment-declarations/{decl_id}/reject")
def reject_declaration(
    decl_id: int, data: PaymentDeclarationReject,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    from datetime import datetime as dt
    decl = db.query(PaymentDeclaration).filter(PaymentDeclaration.id == decl_id).first()
    if not decl:
        raise HTTPException(status_code=404, detail="Declaration not found")
    if decl.status != PaymentDeclarationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Declaration already processed")
    decl.status = PaymentDeclarationStatus.REJECTED
    decl.rejection_reason = data.rejection_reason
    decl.confirmed_by = current_user.id
    decl.confirmed_at = dt.utcnow()
    invoice = db.query(Invoice).filter(Invoice.id == decl.invoice_id).first()
    if invoice:
        send_bulk_notifications(
            db,
            _get_student_finance_recipient_ids(db, invoice.student_id),
            "Payment declaration rejected",
            data.rejection_reason or "Your payment declaration could not be confirmed.",
        )
    log_action(db, "REJECT_DECLARATION", "PaymentDeclaration", current_user.id, entity_id=decl_id)
    db.commit()
    return success_response(None, "Declaration rejected")


# --- Direct Payment (admin records payment for a student, auto-creates invoice if missing) ---
@router.post("/direct-payment")
def direct_payment(
    data: DirectPaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    from decimal import Decimal as D
    from app.models.student import Student

    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_id = data.class_id or student.current_class_id
    if not class_id:
        raise HTTPException(status_code=400, detail="Student is not assigned to a class — assign them first")

    # Find existing invoice for this student/session/term or create one
    invoice = db.query(Invoice).filter(
        Invoice.student_id == data.student_id,
        Invoice.session_id == data.session_id,
        Invoice.term_id == data.term_id,
    ).first()

    if not invoice:
        invoice = Invoice(
            student_id=data.student_id,
            class_id=class_id,
            session_id=data.session_id,
            term_id=data.term_id,
            total_fee=data.total_fee,
            paid_amount=D("0"),
            balance=data.total_fee,
            status=InvoiceStatus.UNPAID,
        )
        db.add(invoice)
        db.flush()

    pdata = PaymentCreate(
        invoice_id=invoice.id,
        amount_paid=data.amount_paid,
        payment_method=data.payment_method,
        receipt_number=data.receipt_number,
        payment_date=data.payment_date,
    )
    try:
        payment = record_payment(db, pdata, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    log_action(db, "DIRECT_PAYMENT", "Payment", current_user.id, entity_id=payment.id,
               new_value={"student_id": data.student_id, "amount": float(data.amount_paid)})
    db.commit()
    return success_response({
        "invoice_id": invoice.id,
        "payment_id": payment.id,
        "invoice_status": invoice.status.value,
    }, "Payment recorded successfully")


# --- Paystack ---
@router.post("/paystack/initialize")
def initialize_paystack(
    data: PaystackInitializeIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # This creates a local transaction record first, then hands the payer over to
    # Paystack. The invoice itself is only settled after verify/webhook succeeds.
    if not paystack_is_configured():
        raise HTTPException(status_code=503, detail="Paystack is not configured yet")

    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if current_user.role == UserRole.STUDENT and student_requires_parent_portal(db, invoice.student):
        raise HTTPException(
            status_code=403,
            detail="Online payment for this class must be completed from the parent account.",
        )
    _assert_user_can_access_invoice(db, current_user, invoice)
    if invoice.status == InvoiceStatus.PAID or Decimal(str(invoice.balance)) <= 0:
        raise HTTPException(status_code=400, detail="This invoice has already been paid")

    amount_to_charge = _resolve_parent_payment_amount(invoice, data.payment_option)
    amount_minor = _minor_units(amount_to_charge)
    reference = f"SMS-PSTK-{invoice.id}-{uuid.uuid4().hex[:10].upper()}"
    callback_url = (
        settings.paystack_callback_url_normalized
        or f"{settings.frontend_url_normalized}{_get_paystack_callback_path(current_user)}"
    )
    payload = {
        "email": current_user.email,
        "amount": amount_minor,
        "reference": reference,
        "callback_url": callback_url,
        "metadata": {
            "invoice_id": invoice.id,
            "student_id": invoice.student_id,
            "session_id": invoice.session_id,
            "term_id": invoice.term_id,
            "initiated_by_user_id": current_user.id,
            "payment_option": data.payment_option,
            "scheduled_amount": str(amount_to_charge),
        },
        "currency": "NGN",
    }
    try:
        response = initialize_paystack_transaction(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Paystack initialize failed: {exc}") from exc

    response_data = response.get("data") or {}
    transaction = PaystackTransaction(
        invoice_id=invoice.id,
        student_id=invoice.student_id,
        initiated_by_user_id=current_user.id,
        reference=reference,
        authorization_url=response_data.get("authorization_url"),
        access_code=response_data.get("access_code"),
        amount_minor=amount_minor,
        currency="NGN",
        status=PaystackTransactionStatus.INITIALIZED,
        raw_initialize_response=response,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return success_response(
        PaystackInitializeOut(
            reference=transaction.reference,
            authorization_url=transaction.authorization_url or "",
            access_code=transaction.access_code or "",
            invoice_id=transaction.invoice_id,
            amount_minor=transaction.amount_minor,
            currency=transaction.currency,
        ).model_dump(),
        "Paystack checkout initialized",
    )


@router.get("/paystack/verify/{reference}")
def verify_paystack(
    reference: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # The redirect back from Paystack hits this route so the UI can refresh the
    # invoice immediately, even if the webhook is still in flight.
    if not paystack_is_configured():
        raise HTTPException(status_code=503, detail="Paystack is not configured yet")

    transaction = get_paystack_transaction_by_reference(db, reference)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    invoice = db.query(Invoice).filter(Invoice.id == transaction.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if current_user.role == UserRole.STUDENT and student_requires_parent_portal(db, invoice.student):
        raise HTTPException(
            status_code=403,
            detail="Online payment for this class must be verified from the parent account.",
        )
    _assert_user_can_access_invoice(db, current_user, invoice)

    try:
        response = verify_paystack_transaction(reference)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Paystack verification failed: {exc}") from exc

    _sync_paystack_transaction(db, transaction, response)
    db.commit()
    db.refresh(transaction)
    return success_response(_serialize_paystack_transaction(transaction), "Paystack transaction verified")


@router.get("/paystack/transactions")
def paystack_transactions(
    status: Optional[PaystackTransactionStatus] = None,
    invoice_id: Optional[int] = None,
    student_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    rows, total = list_paystack_transactions(
        db,
        status=status,
        invoice_id=invoice_id,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )
    return paginated_response(
        [_serialize_paystack_transaction_list_item(row) for row in rows],
        total,
        skip // limit + 1,
        limit,
    )


@router.get("/paystack/transactions/mine")
def my_paystack_transactions(
    student_id: Optional[int] = None,
    status: Optional[PaystackTransactionStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters: dict = {"status": status, "skip": skip, "limit": limit}
    if current_user.role == UserRole.STUDENT:
        from app.models.student import Student

        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        if student_requires_parent_portal(db, student):
            raise HTTPException(status_code=403, detail="This class uses parent-only online payments")
        filters["student_id"] = student.id
    elif current_user.role == UserRole.PARENT:
        from app.models.parent import Parent, ParentStudent

        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent profile not found")
        linked_ids = [
            link.student_id
            for link in db.query(ParentStudent).filter(ParentStudent.parent_id == parent.id).all()
        ]
        if student_id and student_id not in linked_ids:
            raise HTTPException(status_code=403, detail="Not your child's transaction")
        filters["student_ids"] = [student_id] if student_id else linked_ids
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    rows, total = list_paystack_transactions(db, **filters)
    return paginated_response(
        [_serialize_paystack_transaction_list_item(row) for row in rows],
        total,
        skip // limit + 1,
        limit,
    )


@router.post("/paystack/webhook")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    # Webhooks are the durable source of truth for completed charges. They let us
    # reconcile payments even when the browser never returns from checkout.
    if not paystack_is_configured():
        raise HTTPException(status_code=503, detail="Paystack is not configured yet")

    payload = await request.body()
    if not verify_paystack_signature(payload, x_paystack_signature):
        raise HTTPException(status_code=401, detail="Invalid Paystack signature")

    event = await request.json()
    event_name = event.get("event")
    event_data = event.get("data") or {}
    reference = event_data.get("reference")

    if event_name == "charge.success" and reference:
        transaction = get_paystack_transaction_by_reference(db, reference)
        if transaction:
            verify_response = verify_paystack_transaction(reference)
            _sync_paystack_transaction(db, transaction, verify_response)
            db.commit()

    return success_response({"received": True}, "Webhook processed")


# --- Ledger (accounting view) ---
@router.get("/ledger")
def get_ledger(
    limit: int = 100,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    from sqlalchemy import func
    payments = db.query(Payment).order_by(Payment.payment_date.desc()).limit(limit).all()
    expenses = db.query(Expenditure).filter(
        Expenditure.approval_status == "APPROVED"
    ).order_by(Expenditure.date.desc()).limit(limit).all()
    payrolls = db.query(Payroll).filter(
        Payroll.payment_status == "PAID"
    ).order_by(Payroll.payment_date.desc()).limit(limit).all()

    entries = []
    for p in payments:
        entries.append({
            "type": "INCOME", "id": p.id, "label": f"Fee Payment #{p.id}",
            "amount": float(p.amount_paid), "date": str(p.payment_date),
            "method": p.payment_method, "ref": p.receipt_number,
            "invoice_id": p.invoice_id,
        })
    for e in expenses:
        entries.append({
            "type": "EXPENSE", "id": e.id, "label": e.title,
            "amount": float(e.amount), "date": str(e.date),
            "method": "—", "ref": e.category,
            "invoice_id": None,
        })
    for pr in payrolls:
        entries.append({
            "type": "SALARY", "id": pr.id, "label": f"Salary — Staff #{pr.staff_id}",
            "amount": float(pr.net_salary), "date": str(pr.payment_date),
            "method": "PAYROLL", "ref": f"{pr.month}/{pr.year}",
            "invoice_id": None,
        })
    entries.sort(key=lambda x: x["date"] or "", reverse=True)
    return success_response(entries[:limit])


# --- Profit/Loss ---
@router.get("/reports/profit-loss")
def profit_loss_report(
    session_id: Optional[int] = None, term_id: Optional[int] = None, month: Optional[int] = None, year: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(is_vp_or_above)
):
    report = get_profit_loss(db, session_id=session_id, term_id=term_id, month=month, year=year)
    return success_response(report)


# ── Optional Fees ──────────────────────────────────────────────────────────────

@router.get("/optional-fees", response_model=None)
def get_optional_fees(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    fees = list_optional_fees(db)
    return success_response([OptionalFeeOut.model_validate(f) for f in fees])


@router.post("/optional-fees", response_model=None)
def add_optional_fee(data: OptionalFeeCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    fee = create_optional_fee(db, data)
    db.commit()
    db.refresh(fee)
    return success_response(OptionalFeeOut.model_validate(fee))


@router.put("/optional-fees/{fee_id}", response_model=None)
def edit_optional_fee(fee_id: int, data: OptionalFeeUpdate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    fee = update_optional_fee(db, fee_id, data)
    if not fee:
        raise HTTPException(status_code=404, detail="Optional fee not found")
    db.commit()
    db.refresh(fee)
    return success_response(OptionalFeeOut.model_validate(fee))


@router.delete("/optional-fees/{fee_id}", response_model=None)
def remove_optional_fee(fee_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    ok = delete_optional_fee(db, fee_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Optional fee not found")
    db.commit()
    return success_response({"message": "Deleted"})
