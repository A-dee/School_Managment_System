import os
import uuid
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.finance import FeeStructure, Invoice, Payment, Expenditure, Payroll, PaymentDeclaration, PaymentDeclarationStatus
from app.schemas.finance import (
    FeeStructureCreate, FeeStructureOut, InvoiceOut,
    PaymentCreate, PaymentOut, ExpenditureCreate, ExpenditureOut,
    PayrollCreate, PayrollOut, GenerateInvoicesRequest,
    PaymentDeclarationIn, PaymentDeclarationOut,
    PaymentDeclarationConfirm, PaymentDeclarationReject,
    DirectPaymentCreate,
)
from app.crud.finance import (
    create_fee_structure, generate_invoices_for_term, get_invoice,
    get_student_invoices, record_payment, get_debtors,
    create_expenditure, approve_expenditure, reject_expenditure,
    create_payroll, mark_payroll_paid, get_profit_loss
)
from app.utils.rbac import is_principal_or_above, is_admin_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response, paginated_response
from app.utils.audit import log_action
from app.config import settings

router = APIRouter(prefix="/finance", tags=["Finance"])


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
    invoices = get_student_invoices(db, student.id)
    return success_response([InvoiceOut.model_validate(i).model_dump() for i in invoices])


@router.get("/invoices/student/{student_id}")
def student_invoices(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.user import UserRole
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
    payment = record_payment(db, data, current_user.id)
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
def approve_expense(expense_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    expense = db.query(Expenditure).filter(Expenditure.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expenditure not found")
    approve_expenditure(db, expense, current_user.id)
    log_action(db, "APPROVE_EXPENSE", "Expenditure", current_user.id, entity_id=expense_id)
    db.commit()
    return success_response(None, "Expenditure approved")


@router.post("/expenditures/{expense_id}/reject")
def reject_expense(expense_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
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
    if current_user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == invoice.student_id
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Not your child's invoice")
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
        invoice.paid_amount = float(invoice.paid_amount) + float(data.confirmed_amount)
        invoice.balance = float(invoice.total_fee) - float(invoice.paid_amount)
        if invoice.balance <= 0:
            invoice.status = InvoiceStatus.PAID
            invoice.balance = 0
        else:
            invoice.status = InvoiceStatus.PARTIAL
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
    payment = record_payment(db, pdata, current_user.id)
    log_action(db, "DIRECT_PAYMENT", "Payment", current_user.id, entity_id=payment.id,
               new_value={"student_id": data.student_id, "amount": float(data.amount_paid)})
    db.commit()
    return success_response({
        "invoice_id": invoice.id,
        "payment_id": payment.id,
        "invoice_status": invoice.status.value,
    }, "Payment recorded successfully")


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
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    report = get_profit_loss(db, session_id=session_id, term_id=term_id, month=month, year=year)
    return success_response(report)
