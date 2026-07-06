from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.report_card_meta import ReportCardMeta
from app.models.student import Student
from app.models.academic import AcademicSession, Term
from app.models.class_ import Class
from app.schemas.report_card import ReportCardMetaIn, ReportCardMetaOut
from app.utils.auth import get_current_user
from app.utils.rbac import is_teacher_or_above, is_super_admin
from app.utils.response import success_response
from app.models.user import UserRole
from app.crud.staff import get_staff_by_user_id
from app.routes.notifications import send_bulk_notifications

router = APIRouter(prefix="/report-cards", tags=["Report Cards"])


def _get_or_none(db: Session, student_id: int, term_id: int, session_id: int):
    return db.query(ReportCardMeta).filter(
        ReportCardMeta.student_id == student_id,
        ReportCardMeta.term_id == term_id,
        ReportCardMeta.session_id == session_id,
    ).first()


def _assert_teacher_can_access_student(db: Session, current_user, student: Student):
    if current_user.role != UserRole.TEACHER:
        return
    from app.models.class_ import Class
    staff = get_staff_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(status_code=403, detail="Staff profile not found")
    cls = db.query(Class).filter(Class.id == student.current_class_id, Class.class_teacher_id == staff.id).first()
    if not cls:
        raise HTTPException(status_code=403, detail="You can only access report cards for your own class")


def _get_report_card_recipient_ids(db: Session, student_id: int) -> set[int]:
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


# ── Student-facing endpoint MUST come before /{student_id} ──────────────────

@router.get("/my/{term_id}/{session_id}")
def get_my_report_card(
    term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    """Student-facing: only returns the card if approved by the proprietor.
    Includes enriched context (student info, class, session, term names)."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    record = _get_or_none(db, student.id, term_id, session_id)
    if not record or not record.approved:
        return success_response(None)

    # Enrich with context needed for the print template
    session_obj = db.query(AcademicSession).filter(AcademicSession.id == session_id).first()
    term_obj    = db.query(Term).filter(Term.id == term_id).first()
    from app.models.result import Result
    result_row = db.query(Result).filter(
        Result.student_id == student.id,
        Result.term_id == term_id,
        Result.session_id == session_id,
    ).first()
    class_id = result_row.class_id if result_row else student.current_class_id
    class_obj = db.query(Class).filter(Class.id == class_id).first() if class_id else None

    data = ReportCardMetaOut.model_validate(record).model_dump()
    data["student_name"]      = f"{student.first_name} {student.last_name}"
    data["admission_number"]  = student.admission_number
    data["class_name"]        = class_obj.name if class_obj else ""
    data["session_name"]      = session_obj.name if session_obj else ""
    data["term_name"]         = term_obj.name if term_obj else ""
    return success_response(data)


# ── Staff / admin endpoints ──────────────────────────────────────────────────

@router.get("/class/{class_id}")
def get_class_report_card_status(
    class_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
    if current_user.role == UserRole.TEACHER:
        staff = get_staff_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        own_class = db.query(Class).filter(Class.id == class_id, Class.class_teacher_id == staff.id).first()
        if not own_class:
            raise HTTPException(status_code=403, detail="You can only access report cards for your own class")
    students = db.query(Student).filter(Student.current_class_id == class_id).all()
    student_ids = [s.id for s in students]
    metas = {
        m.student_id: m
        for m in db.query(ReportCardMeta).filter(
            ReportCardMeta.student_id.in_(student_ids),
            ReportCardMeta.term_id == term_id,
            ReportCardMeta.session_id == session_id,
        ).all()
    }
    result = []
    for s in students:
        m = metas.get(s.id)
        result.append({
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}",
            "admission_number": s.admission_number,
            "has_meta": m is not None,
            "approved": m.approved if m else False,
            "approved_at": m.approved_at if m else None,
        })
    return success_response(result)


@router.get("/{student_id}")
def get_report_card_meta(
    student_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    record = _get_or_none(db, student_id, term_id, session_id)
    return success_response(ReportCardMetaOut.model_validate(record).model_dump() if record else None)


@router.put("/{student_id}")
def save_report_card_meta(
    student_id: int, data: ReportCardMetaIn,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    record = _get_or_none(db, student_id, data.term_id, data.session_id)
    if not record:
        record = ReportCardMeta(
            student_id=student_id,
            term_id=data.term_id,
            session_id=data.session_id,
        )
        db.add(record)
    for field, value in data.model_dump(exclude_unset=True, exclude={"term_id", "session_id"}).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return success_response(ReportCardMetaOut.model_validate(record).model_dump(), "Report card saved")


@router.post("/{student_id}/approve")
def approve_report_card(
    student_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_super_admin),
):
    record = _get_or_none(db, student_id, term_id, session_id)
    if not record:
        raise HTTPException(status_code=404, detail="No report card meta found. Save the card first.")
    record.approved = True
    record.approved_by_id = current_user.id
    record.approved_at = datetime.utcnow()
    send_bulk_notifications(
        db,
        _get_report_card_recipient_ids(db, student_id),
        "Report card approved",
        "A report card has been approved and is now available on the portal.",
    )
    db.commit()
    return success_response({"approved": True}, "Report card approved")


@router.post("/{student_id}/unapprove")
def unapprove_report_card(
    student_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_super_admin),
):
    record = _get_or_none(db, student_id, term_id, session_id)
    if not record:
        raise HTTPException(status_code=404, detail="No report card found")
    record.approved = False
    record.approved_by_id = None
    record.approved_at = None
    db.commit()
    return success_response({"approved": False}, "Approval revoked")


@router.post("/class/{class_id}/approve-all")
def approve_all_class_report_cards(
    class_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_super_admin),
):
    now = datetime.utcnow()
    records = db.query(ReportCardMeta).filter(
        ReportCardMeta.term_id == term_id,
        ReportCardMeta.session_id == session_id,
    ).join(Student, Student.id == ReportCardMeta.student_id).filter(
        Student.current_class_id == class_id,
    ).all()
    for r in records:
        r.approved = True
        r.approved_by_id = current_user.id
        r.approved_at = now
    recipient_ids: set[int] = set()
    for r in records:
        recipient_ids.update(_get_report_card_recipient_ids(db, r.student_id))
    send_bulk_notifications(
        db,
        recipient_ids,
        "Report cards approved",
        "Approved report cards for your class are now available on the portal.",
    )
    db.commit()
    return success_response({"approved_count": len(records)}, f"{len(records)} report card(s) approved")
