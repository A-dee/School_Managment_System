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
from app.models.user import UserRole

router = APIRouter(prefix="/pdfs", tags=["PDFs"])


@router.get("/report-card/{student_id}")
def report_card_pdf(
    student_id: int, session_id: int, term_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    from app.models.academic import AcademicSession, Term
    from app.models.subject import Subject
    from app.models.attendance import Attendance, AttendanceStatus
    from app.models.student import Student
    from app.models.class_ import Class

    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own report card")
    if current_user.role == UserRole.PARENT:
        from app.models.parent import Parent, ParentStudent
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student_id,
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Not your child")
    if current_user.role == UserRole.TEACHER:
        from app.models.class_ import Class
        from app.crud.staff import get_staff_by_user_id
        staff = get_staff_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        own_class = db.query(Class).filter(Class.id == student.current_class_id, Class.class_teacher_id == staff.id).first()
        if not own_class:
            raise HTTPException(status_code=403, detail="You can only access report cards for your own class")

    results = db.query(Result).filter(
        Result.student_id == student_id,
        Result.session_id == session_id,
        Result.term_id == term_id,
        Result.status == ResultStatus.PUBLISHED,
    ).all()

    session = db.query(AcademicSession).filter(AcademicSession.id == session_id).first()
    term = db.query(Term).filter(Term.id == term_id).first()

    # Resolve subject names
    subject_map = {}
    for r in results:
        if r.subject_id not in subject_map:
            subj = db.query(Subject).filter(Subject.id == r.subject_id).first()
            subject_map[r.subject_id] = subj.name if subj else f"Subject {r.subject_id}"

    results_data = [{
        "subject_name": subject_map.get(r.subject_id, f"Subject {r.subject_id}"),
        "ca_score": float(r.ca_score),
        "exam_score": float(r.exam_score),
        "total_score": float(r.total_score),
        "grade": r.grade,
        "remarks": r.remarks or "",
    } for r in results]

    report_class_id = results[0].class_id if results else student.current_class_id

    # Attendance for this student in the requested term/session/class
    att_query = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.class_id == report_class_id,
    ) if report_class_id else None
    if att_query is not None and term:
        att_query = att_query.filter(Attendance.date >= term.start_date, Attendance.date <= term.end_date)
    att_records = att_query.all() if att_query is not None else []
    attendance = {
        "days_present": sum(1 for a in att_records if a.status == AttendanceStatus.PRESENT),
        "days_absent": sum(1 for a in att_records if a.status == AttendanceStatus.ABSENT),
        "days_late": sum(1 for a in att_records if a.status == AttendanceStatus.LATE),
    }

    # Class size
    class_size = (
        db.query(Student).filter(Student.current_class_id == report_class_id).count()
        if report_class_id else None
    )

    class_obj = db.query(Class).filter(Class.id == report_class_id).first() if report_class_id else None

    student_dict = {
        "first_name": student.first_name,
        "last_name": student.last_name,
        "admission_number": student.admission_number,
        "class_name": class_obj.name if class_obj else "",
        "class_position": results[0].class_position if results else None,
        "class_size": class_size,
    }

    pdf_bytes = generate_report_card_pdf(
        student_dict, results_data,
        session.name if session else "", term.name if term else "",
        attendance if att_records else None,
    )
    fname = f"report_card_{student.last_name}_{student.first_name}_{term_id}.pdf".replace(" ", "_")
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={fname}"})


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
