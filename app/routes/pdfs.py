from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.result import Result, ResultStatus
from app.models.finance import Payment, Invoice, Payroll
from app.utils.auth import get_current_user
from app.utils.rbac import is_principal_or_above, is_admin_or_above
from app.utils.pdf import generate_report_card_pdf, generate_receipt_pdf, generate_payslip_pdf
from app.crud.student import get_student_by_id
from app.crud.staff import get_staff_by_id

router = APIRouter(prefix="/pdfs", tags=["PDFs"])


@router.get("/report-card/{student_id}")
def report_card_pdf(
    student_id: int, session_id: int, term_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = db.query(Result).filter(
        Result.student_id == student_id,
        Result.session_id == session_id,
        Result.term_id == term_id,
        Result.status == ResultStatus.PUBLISHED,
    ).all()

    from app.models.academic import AcademicSession, Term
    session = db.query(AcademicSession).filter(AcademicSession.id == session_id).first()
    term = db.query(Term).filter(Term.id == term_id).first()

    student_dict = {
        "first_name": student.first_name,
        "last_name": student.last_name,
        "admission_number": student.admission_number,
        "class_name": student.current_class.name if student.current_class else "",
        "class_position": results[0].class_position if results else None,
    }
    results_data = [{
        "subject_name": f"Subject {r.subject_id}",
        "ca_score": float(r.ca_score),
        "exam_score": float(r.exam_score),
        "total_score": float(r.total_score),
        "grade": r.grade,
        "remarks": r.remarks,
    } for r in results]

    pdf_bytes = generate_report_card_pdf(
        student_dict, results_data,
        session.name if session else "", term.name if term else ""
    )
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=report_card_{student_id}.pdf"})


@router.get("/receipt/{payment_id}")
def receipt_pdf(payment_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
    student = get_student_by_id(db, invoice.student_id)

    payment_dict = {
        "receipt_number": payment.receipt_number,
        "payment_date": payment.payment_date,
        "amount_paid": payment.amount_paid,
        "payment_method": payment.payment_method,
    }
    student_dict = {"first_name": student.first_name, "last_name": student.last_name, "admission_number": student.admission_number}
    invoice_dict = {"balance": invoice.balance, "status": invoice.status.value}

    pdf_bytes = generate_receipt_pdf(payment_dict, student_dict, invoice_dict)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=receipt_{payment_id}.pdf"})


@router.get("/payslip/{payroll_id}")
def payslip_pdf(payroll_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    staff = get_staff_by_id(db, payroll.staff_id)

    payroll_dict = {
        "month": payroll.month, "year": payroll.year,
        "salary_amount": payroll.salary_amount, "bonuses": payroll.bonuses,
        "deductions": payroll.deductions, "net_salary": payroll.net_salary,
        "payment_status": payroll.payment_status.value, "payment_date": payroll.payment_date,
    }
    staff_dict = {"full_name": staff.full_name, "staff_type": staff.staff_type.value}

    pdf_bytes = generate_payslip_pdf(payroll_dict, staff_dict)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=payslip_{payroll_id}.pdf"})
