from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.student import Student, StudentStatus
from app.models.staff import Staff
from app.models.finance import Invoice, Payment, InvoiceStatus
from app.models.result import Result, ResultStatus
from app.utils.rbac import is_principal_or_above, is_admin_or_above
from app.utils.export import export_to_csv, export_to_excel

router = APIRouter(prefix="/exports", tags=["Exports"])


@router.get("/students")
def export_students(
    fmt: str = Query("csv", enum=["csv", "excel"]),
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    students = db.query(Student).filter(Student.status == StudentStatus.ACTIVE).all()
    data = [{
        "admission_number": s.admission_number,
        "first_name": s.first_name,
        "last_name": s.last_name,
        "gender": s.gender.value,
        "class_id": s.current_class_id,
        "status": s.status.value,
        "guardian_name": s.guardian_name,
        "guardian_phone": s.guardian_phone,
    } for s in students]
    if fmt == "excel":
        return export_to_excel(data, "students", "Students")
    return export_to_csv(data, "students")


@router.get("/debtors")
def export_debtors(
    session_id: int, term_id: int,
    fmt: str = Query("csv", enum=["csv", "excel"]),
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    invoices = db.query(Invoice).filter(
        Invoice.session_id == session_id,
        Invoice.term_id == term_id,
        Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL]),
    ).all()
    data = [{
        "student_id": i.student_id,
        "total_fee": float(i.total_fee),
        "paid_amount": float(i.paid_amount),
        "balance": float(i.balance),
        "status": i.status.value,
    } for i in invoices]
    if fmt == "excel":
        return export_to_excel(data, "debtors", "Debtors")
    return export_to_csv(data, "debtors")


@router.get("/payments")
def export_payments(
    fmt: str = Query("csv", enum=["csv", "excel"]),
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    payments = db.query(Payment).all()
    data = [{
        "id": p.id,
        "invoice_id": p.invoice_id,
        "amount_paid": float(p.amount_paid),
        "payment_method": p.payment_method,
        "receipt_number": p.receipt_number,
        "payment_date": str(p.payment_date),
    } for p in payments]
    if fmt == "excel":
        return export_to_excel(data, "payments", "Payments")
    return export_to_csv(data, "payments")


@router.get("/staff")
def export_staff(
    fmt: str = Query("csv", enum=["csv", "excel"]),
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    staff_list = db.query(Staff).all()
    data = [{
        "id": s.id,
        "full_name": s.full_name,
        "email": s.email,
        "staff_type": s.staff_type.value,
        "status": s.status.value,
        "salary_amount": float(s.salary_amount),
        "employment_date": str(s.employment_date),
    } for s in staff_list]
    if fmt == "excel":
        return export_to_excel(data, "staff", "Staff")
    return export_to_csv(data, "staff")


@router.get("/results")
def export_results(
    class_id: int, term_id: int, session_id: int,
    fmt: str = Query("csv", enum=["csv", "excel"]),
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    results = db.query(Result).filter(
        Result.class_id == class_id,
        Result.term_id == term_id,
        Result.session_id == session_id,
        Result.status == ResultStatus.PUBLISHED,
    ).all()
    data = [{
        "student_id": r.student_id,
        "subject_id": r.subject_id,
        "ca_score": float(r.ca_score),
        "exam_score": float(r.exam_score),
        "total_score": float(r.total_score),
        "grade": r.grade,
        "class_position": r.class_position,
    } for r in results]
    if fmt == "excel":
        return export_to_excel(data, "results", "Results")
    return export_to_csv(data, "results")
