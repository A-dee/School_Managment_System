from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.report_card_meta import ReportCardMeta
from app.schemas.report_card import ReportCardMetaIn, ReportCardMetaOut
from app.utils.rbac import is_teacher_or_above
from app.utils.response import success_response

router = APIRouter(prefix="/report-cards", tags=["Report Cards"])


@router.get("/{student_id}")
def get_report_card_meta(
    student_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
    record = db.query(ReportCardMeta).filter(
        ReportCardMeta.student_id == student_id,
        ReportCardMeta.term_id == term_id,
        ReportCardMeta.session_id == session_id,
    ).first()
    return success_response(ReportCardMetaOut.model_validate(record).model_dump() if record else None)


@router.put("/{student_id}")
def save_report_card_meta(
    student_id: int, data: ReportCardMetaIn,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above),
):
    record = db.query(ReportCardMeta).filter(
        ReportCardMeta.student_id == student_id,
        ReportCardMeta.term_id == data.term_id,
        ReportCardMeta.session_id == data.session_id,
    ).first()
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
