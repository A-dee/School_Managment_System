from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.crud.staff import get_staff_by_id
from app.crud.student import get_student_by_id
from app.database import get_db
from app.models.finance import Payment, Invoice, Payroll
from app.models.report_card_meta import ReportCardMeta
from app.models.result import Result, ResultStatus
from app.models.user import UserRole
from app.utils.auth import get_current_user
from app.utils.pdf import generate_payslip_pdf, generate_receipt_pdf, generate_report_card_pdf
from app.utils.rbac import is_admin_or_above

router = APIRouter(prefix="/pdfs", tags=["PDFs"])


def _grade_from_average(score: float, db: Session | None = None) -> str:
    if db:
        from app.models.result import GradeScale
        try:
            scale = db.query(GradeScale).filter(GradeScale.min_score <= score).order_by(GradeScale.min_score.desc()).first()
            if scale:
                return scale.grade
        except Exception:
            pass
    if score >= 80:
        return "A"
    if score >= 70:
        return "B"
    if score >= 60:
        return "C"
    if score >= 50:
        return "D"
    if score >= 40:
        return "E"
    return "F"


def _grade_remark(grade: str, db: Session | None = None) -> str:
    if db:
        from app.models.result import GradeScale
        try:
            scale = db.query(GradeScale).filter(GradeScale.grade == grade).first()
            if scale:
                return scale.remark
        except Exception:
            pass
    return {
        "A": "Excellent",
        "B": "Very Good",
        "C": "Good",
        "D": "Fair",
        "E": "Pass",
        "F": "Fail",
    }.get(grade, "")


def _result_status(score: float) -> str:
    return "Pass" if score >= 40 else "Needs Improvement"


def _ordinal(value: int | None) -> str:
    if not value:
        return "-"
    if 10 <= value % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def _display_name_for_user(user) -> str:
    if not user:
        return "Principal"
    if getattr(user, "staff", None) and user.staff.full_name:
        return user.staff.full_name
    email = getattr(user, "email", "")
    if email and "@" in email:
        return email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()
    role = getattr(user, "role", None)
    return role.value.replace("_", " ").title() if role else "Principal"


def _attendance_remark(percentage: float, late_days: int) -> str:
    if percentage >= 95 and late_days <= 1:
        return "Outstanding attendance and punctuality."
    if percentage >= 85:
        return "Good attendance. Keep punctuality steady."
    if percentage >= 75:
        return "Fair attendance. Improvement is encouraged."
    return "Attendance needs immediate improvement."


@router.get("/report-card/{student_id}")
def report_card_pdf(
    student_id: int,
    session_id: int,
    term_id: int,
    copy_type: str | None = None,
    teacher_signature_url: str | None = None,
    principal_signature_url: str | None = None,
    school_stamp_url: str | None = None,
    school_logo_url: str | None = "/lenage-logo.png",
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    from app.models.attendance import Attendance, AttendanceStatus
    from app.models.academic import AcademicSession, Term
    from app.models.class_ import Class
    from app.models.parent import Parent, ParentStudent
    from app.models.student import Student
    from app.models.subject import Subject
    from app.models.user import User

    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own report card")
    if current_user.role == UserRole.PARENT:
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
    report_meta = db.query(ReportCardMeta).filter(
        ReportCardMeta.student_id == student_id,
        ReportCardMeta.session_id == session_id,
        ReportCardMeta.term_id == term_id,
    ).first()

    requested_copy_type = (copy_type or "").strip().lower()
    if requested_copy_type not in {"parent", "official"}:
        requested_copy_type = "parent" if current_user.role in {UserRole.PARENT, UserRole.STUDENT} else "official"

    # Resolve subject names
    subject_map = {}
    for r in results:
        if r.subject_id not in subject_map:
            subj = db.query(Subject).filter(Subject.id == r.subject_id).first()
            subject_map[r.subject_id] = subj.name if subj else f"Subject {r.subject_id}"

    report_class_id = results[0].class_id if results else student.current_class_id

    # Attendance for this student in the requested term/session/class
    att_query = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.class_id == report_class_id,
    ) if report_class_id else None
    if att_query is not None and term:
        att_query = att_query.filter(Attendance.date >= term.start_date, Attendance.date <= term.end_date)
    att_records = att_query.all() if att_query is not None else []
    raw_days_present = sum(1 for a in att_records if a.status == AttendanceStatus.PRESENT)
    raw_days_absent = sum(1 for a in att_records if a.status == AttendanceStatus.ABSENT)
    raw_days_late = sum(1 for a in att_records if a.status == AttendanceStatus.LATE)

    # Class size
    class_size = (
        db.query(Student).filter(Student.current_class_id == report_class_id).count()
        if report_class_id else None
    )

    class_obj = db.query(Class).filter(Class.id == report_class_id).first() if report_class_id else None

    subject_positions: dict[int, dict[int, int]] = {}
    if results and report_class_id:
        ranked_rows = db.query(Result).filter(
            Result.class_id == report_class_id,
            Result.session_id == session_id,
            Result.term_id == term_id,
            Result.status == ResultStatus.PUBLISHED,
            Result.subject_id.in_([r.subject_id for r in results]),
        ).all()
        grouped: dict[int, list[Result]] = {}
        for row in ranked_rows:
            grouped.setdefault(row.subject_id, []).append(row)
        for subject_id, group in grouped.items():
            ordered = sorted(group, key=lambda item: float(item.total_score or 0), reverse=True)
            ranking: dict[int, int] = {}
            previous_score = None
            current_rank = 0
            for index, item in enumerate(ordered, start=1):
                score = float(item.total_score or 0)
                if previous_score is None or score < previous_score:
                    current_rank = index
                    previous_score = score
                ranking[item.student_id] = current_rank
            subject_positions[subject_id] = ranking

    results_data = [{
        "subject_name": subject_map.get(r.subject_id, f"Subject {r.subject_id}"),
        "ca1_score": float(r.ca_score),
        "ca2_score": None,
        "exam_score": float(r.exam_score),
        "total_score": float(r.total_score),
        "grade": r.grade or _grade_from_average(float(r.total_score or 0), db),
        "remark": r.remarks or _grade_remark(r.grade or _grade_from_average(float(r.total_score or 0), db), db),
        "subject_position": _ordinal(subject_positions.get(r.subject_id, {}).get(student_id)),
    } for r in sorted(results, key=lambda item: subject_map.get(item.subject_id, ""))]

    total_score = sum(float(r.total_score or 0) for r in results)
    average_score = (total_score / len(results)) if results else 0.0
    overall_grade = _grade_from_average(average_score, db)
    class_position = results[0].class_position if results else None
    days_present = report_meta.times_present if report_meta and report_meta.times_present is not None else raw_days_present + raw_days_late
    total_school_days = report_meta.times_school_opened if report_meta and report_meta.times_school_opened is not None else raw_days_present + raw_days_absent + raw_days_late
    days_absent = max(total_school_days - days_present, 0)
    attendance_percentage = (days_present / total_school_days * 100) if total_school_days else 0.0

    approving_user = db.query(User).filter(User.id == report_meta.approved_by_id).first() if report_meta and report_meta.approved_by_id else None
    teacher_name = class_obj.class_teacher.full_name if class_obj and class_obj.class_teacher and class_obj.class_teacher.full_name else "Class Teacher"
    principal_name = _display_name_for_user(approving_user)

    report_payload = {
        "copy_type": requested_copy_type,
        "school_logo_url": school_logo_url,
        "school_stamp_url": school_stamp_url,
        "student_name": f"{student.first_name} {student.last_name}",
        "admission_number": student.admission_number,
        "class_name": class_obj.name if class_obj else "",
        "term_name": term.name if term else "",
        "session_name": session.name if session else "",
        "gender": student.gender.value.title() if getattr(student, "gender", None) else "-",
        "class_teacher_name": teacher_name,
        "total_students": class_size or "-",
        "position_in_class": f"{_ordinal(class_position)} of {class_size}" if class_position and class_size else _ordinal(class_position),
        "total_score": total_score,
        "average_score": average_score,
        "overall_grade": overall_grade,
        "result_status": _result_status(average_score),
        "attendance": {
            "total_school_days": total_school_days,
            "days_present": days_present,
            "days_absent": days_absent,
            "attendance_percentage": attendance_percentage,
            "remark": _attendance_remark(attendance_percentage, raw_days_late),
        },
        "subjects": results_data,
        "teacher_comment": {
            "text": report_meta.class_teacher_comment if report_meta and report_meta.class_teacher_comment else "Steady effort this term. Keep improving across all subjects.",
            "name": teacher_name,
            "signature_url": teacher_signature_url,
            "date": report_meta.updated_at if report_meta else datetime.now(timezone.utc).replace(tzinfo=None),
        },
        "principal_comment": {
            "text": report_meta.head_teacher_comment if report_meta and report_meta.head_teacher_comment else "A formal review has been completed. Continue building on this result.",
            "name": principal_name,
            "signature_url": principal_signature_url,
            "date": report_meta.approved_at if report_meta and report_meta.approved_at else datetime.now(timezone.utc).replace(tzinfo=None),
        },
        "date_issued": report_meta.approved_at if report_meta and report_meta.approved_at else datetime.now(timezone.utc).replace(tzinfo=None),
    }

    pdf_bytes = generate_report_card_pdf(report_payload)
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
