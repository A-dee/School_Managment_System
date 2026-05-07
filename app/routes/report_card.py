from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.report_card_meta import ReportCardMeta
from app.models.student import Student
from app.schemas.report_card import ReportCardMetaIn, ReportCardMetaOut
from app.utils.auth import get_current_user
from app.utils.rbac import is_teacher_or_above, is_super_admin
from app.utils.response import success_response

router = APIRouter(prefix="/report-cards", tags=["Report Cards"])


def _get_or_none(db: Session, student_id: int, term_id: int, session_id: int):
    return db.query(ReportCardMeta).filter(
        ReportCardMeta.student_id == student_id,
        ReportCardMeta.term_id == term_id,
        ReportCardMeta.session_id == session_id,
    ).first()


@router.get("/class/{class_id}")
def get_class_report_card_status(
    class_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
    """Return approval status for all students in a class (for the proprietor overview)."""
    students = db.query(Student).filter(Student.class_id == class_id).all()
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
    record = _get_or_none(db, student_id, term_id, session_id)
    return success_response(ReportCardMetaOut.model_validate(record).model_dump() if record else None)


@router.get("/my/{term_id}/{session_id}")
def get_my_report_card(
    term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    """Student-facing: only returns the card if it has been approved by the proprietor."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    record = _get_or_none(db, student.id, term_id, session_id)
    if not record or not record.approved:
        return success_response(None)
    return success_response(ReportCardMetaOut.model_validate(record).model_dump())


@router.put("/{student_id}")
def save_report_card_meta(
    student_id: int, data: ReportCardMetaIn,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
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
    """Approve all existing report card records for a class/term/session."""
    now = datetime.utcnow()
    records = db.query(ReportCardMeta).filter(
        ReportCardMeta.term_id == term_id,
        ReportCardMeta.session_id == session_id,
    ).join(Student, Student.id == ReportCardMeta.student_id).filter(
        Student.class_id == class_id,
    ).all()
    for r in records:
        r.approved = True
        r.approved_by_id = current_user.id
        r.approved_at = now
    db.commit()
    return success_response({"approved_count": len(records)}, f"{len(records)} report card(s) approved")
