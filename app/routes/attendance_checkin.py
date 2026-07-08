import logging
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.crud.staff import get_staff_by_user_id
from app.database import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.class_ import Class
from app.models.parent import Parent, ParentStudent
from app.models.student import Student
from app.models.user import UserRole
from app.utils.rbac import is_teacher_or_above
from app.utils.response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["Attendance Check-in"])


class AttendanceCheckInRequest(BaseModel):
    admission_number: str = Field(min_length=1, max_length=100)
    action: Literal["IN", "OUT"]


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _student_display_name(student: Student) -> str:
    return f"{student.first_name} {student.last_name}".strip()


def _parent_emails(db: Session, student: Student) -> list[str]:
    emails: set[str] = set()
    if student.guardian_email:
        emails.add(student.guardian_email)

    links = db.query(ParentStudent).filter(ParentStudent.student_id == student.id).all()
    if links:
        parents = db.query(Parent).filter(Parent.id.in_([link.parent_id for link in links])).all()
        for parent in parents:
            if parent.email:
                emails.add(parent.email)
            if parent.user and parent.user.email:
                emails.add(parent.user.email)
    return sorted(emails)


def _simulate_parent_notification(db: Session, student: Student, action: Literal["IN", "OUT"], event_time: datetime) -> None:
    verb = "arrived at" if action == "IN" else "left"
    message = f"{_student_display_name(student)} {verb} school at {event_time.strftime('%H:%M')}"
    emails = _parent_emails(db, student)
    logger.info("Smart attendance notification: %s", message)
    for email in emails:
        logger.info("Simulated parent email to=%s subject=Attendance update body=%s", email, message)


@router.post("/checkin")
def attendance_checkin(
    data: AttendanceCheckInRequest,
    db: Session = Depends(get_db),
    current_user=Depends(is_teacher_or_above),
):
    student = db.query(Student).filter(Student.admission_number == data.admission_number).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.current_class_id:
        raise HTTPException(status_code=400, detail="Student is not assigned to a class")

    if current_user.role == UserRole.TEACHER:
        staff = get_staff_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(status_code=403, detail="Staff profile required to create attendance records")
        assigned_class = db.query(Class).filter(
            Class.id == student.current_class_id,
            Class.class_teacher_id == staff.id,
        ).first()
        if not assigned_class:
            raise HTTPException(status_code=403, detail="You can only check in students in your class")

    today = date.today()
    now = _utc_now_naive()
    record = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.date == today,
    ).first()

    if not record:
        staff = get_staff_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(status_code=403, detail="Staff profile required to create attendance records")
        record = Attendance(
            date=today,
            student_id=student.id,
            class_id=student.current_class_id,
            marked_by_teacher_id=staff.id,
            status=AttendanceStatus.PRESENT,
        )
        db.add(record)

    if data.action == "IN":
        record.check_in_time = now
        message = "Student checked in"
    else:
        record.check_out_time = now
        message = "Student checked out"

    _simulate_parent_notification(db, student, data.action, now)
    db.commit()
    db.refresh(record)

    return success_response(
        {
            "attendance_id": record.id,
            "student_id": student.id,
            "admission_number": student.admission_number,
            "student_name": _student_display_name(student),
            "date": record.date,
            "status": record.status,
            "check_in_time": record.check_in_time,
            "check_out_time": record.check_out_time,
        },
        message,
    )