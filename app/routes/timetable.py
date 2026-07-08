from datetime import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.class_ import Class
from app.models.staff import Staff
from app.models.subject import Subject
from app.models.timetable import TimetableDay, TimetablePeriod, TimetableSlot
from app.utils.auth import get_current_user
from app.utils.rbac import is_admin_or_above
from app.utils.response import success_response

router = APIRouter(prefix="/timetable", tags=["Timetable"])


class TimetablePeriodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_time: time
    end_time: time
    is_academic: bool = True

    @field_validator("end_time")
    @classmethod
    def validate_time_order(cls, value: time, info):
        start_time = info.data.get("start_time")
        if start_time and value <= start_time:
            raise ValueError("end_time must be after start_time")
        return value


class TimetableSlotCreate(BaseModel):
    day_of_week: TimetableDay
    period_id: int = Field(gt=0)
    class_id: int = Field(gt=0)
    subject_id: Optional[int] = Field(default=None, gt=0)
    teacher_id: Optional[int] = Field(default=None, gt=0)
    classroom_name: Optional[str] = Field(default=None, max_length=100)
    force: bool = False


def _serialize_period(period: TimetablePeriod) -> dict:
    return {
        "id": period.id,
        "name": period.name,
        "start_time": period.start_time,
        "end_time": period.end_time,
        "is_academic": period.is_academic,
    }


def _serialize_slot(slot: TimetableSlot) -> dict:
    return {
        "id": slot.id,
        "day_of_week": slot.day_of_week,
        "period_id": slot.period_id,
        "period": _serialize_period(slot.period) if slot.period else None,
        "class_id": slot.class_id,
        "class_name": slot.class_.name if slot.class_ else None,
        "subject_id": slot.subject_id,
        "subject_name": slot.subject.name if slot.subject else None,
        "teacher_id": slot.teacher_id,
        "teacher_name": slot.teacher.full_name if slot.teacher else None,
        "classroom_name": slot.classroom_name,
    }


def _ensure_references_exist(db: Session, data: TimetableSlotCreate) -> None:
    if not db.query(TimetablePeriod).filter(TimetablePeriod.id == data.period_id).first():
        raise HTTPException(status_code=404, detail="Timetable period not found")
    if not db.query(Class).filter(Class.id == data.class_id).first():
        raise HTTPException(status_code=404, detail="Class not found")
    if data.subject_id and not db.query(Subject).filter(Subject.id == data.subject_id).first():
        raise HTTPException(status_code=404, detail="Subject not found")
    if data.teacher_id and not db.query(Staff).filter(Staff.id == data.teacher_id).first():
        raise HTTPException(status_code=404, detail="Teacher not found")


def _find_target_slot(db: Session, data: TimetableSlotCreate) -> Optional[TimetableSlot]:
    return db.query(TimetableSlot).filter(
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.period_id == data.period_id,
        TimetableSlot.class_id == data.class_id,
    ).first()


def _slot_label(slot: TimetableSlot) -> str:
    class_name = slot.class_.name if slot.class_ else f"class #{slot.class_id}"
    period_name = slot.period.name if slot.period else f"period #{slot.period_id}"
    return f"{slot.day_of_week.value} {period_name} for {class_name}"


def _find_conflicts(db: Session, data: TimetableSlotCreate, target_slot: Optional[TimetableSlot]) -> list[str]:
    warnings: list[str] = []
    target_id = target_slot.id if target_slot else None

    base_query = db.query(TimetableSlot).filter(
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.period_id == data.period_id,
    )
    if target_id is not None:
        base_query = base_query.filter(TimetableSlot.id != target_id)

    if data.teacher_id:
        teacher_slot = base_query.filter(TimetableSlot.teacher_id == data.teacher_id).first()
        if teacher_slot:
            teacher_name = teacher_slot.teacher.full_name if teacher_slot.teacher else f"Teacher #{data.teacher_id}"
            warnings.append(f"{teacher_name} is already booked for {_slot_label(teacher_slot)}.")

    classroom_name = data.classroom_name.strip() if data.classroom_name else None
    if classroom_name:
        classroom_slot = base_query.filter(TimetableSlot.classroom_name == classroom_name).first()
        if classroom_slot:
            warnings.append(f"Classroom {classroom_name} is already booked for {_slot_label(classroom_slot)}.")

    class_slot = base_query.filter(TimetableSlot.class_id == data.class_id).first()
    if class_slot:
        subject_name = class_slot.subject.name if class_slot.subject else "a slot"
        warnings.append(f"Class already has {subject_name} scheduled for {_slot_label(class_slot)}.")

    return warnings


@router.post("/periods")
def create_period(
    data: TimetablePeriodCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    period = TimetablePeriod(**data.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return success_response(_serialize_period(period), "Timetable period created")


@router.get("/periods")
def list_periods(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    periods = db.query(TimetablePeriod).order_by(TimetablePeriod.start_time.asc()).all()
    return success_response([_serialize_period(period) for period in periods])


@router.delete("/slots/{id}")
def delete_slot(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")
    db.delete(slot)
    db.commit()
    return success_response(None, "Timetable slot deleted")


@router.get("/class/{class_id}")
def get_class_timetable(
    class_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not db.query(Class).filter(Class.id == class_id).first():
        raise HTTPException(status_code=404, detail="Class not found")
    slots = db.query(TimetableSlot).join(TimetablePeriod).filter(
        TimetableSlot.class_id == class_id,
    ).order_by(TimetableSlot.day_of_week.asc(), TimetablePeriod.start_time.asc()).all()
    return success_response([_serialize_slot(slot) for slot in slots])


@router.get("/teacher/{teacher_id}")
def get_teacher_timetable(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not db.query(Staff).filter(Staff.id == teacher_id).first():
        raise HTTPException(status_code=404, detail="Teacher not found")
    slots = db.query(TimetableSlot).join(TimetablePeriod).filter(
        TimetableSlot.teacher_id == teacher_id,
    ).order_by(TimetableSlot.day_of_week.asc(), TimetablePeriod.start_time.asc()).all()
    return success_response([_serialize_slot(slot) for slot in slots])


@router.post("/slots")
def create_or_update_slot(
    data: TimetableSlotCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    _ensure_references_exist(db, data)
    target_slot = _find_target_slot(db, data)
    warnings = _find_conflicts(db, data, target_slot)

    if warnings and not data.force:
        return {"status": "warning", "warnings": warnings, "data": None}

    slot = target_slot or TimetableSlot()
    slot.day_of_week = data.day_of_week
    slot.period_id = data.period_id
    slot.class_id = data.class_id
    slot.subject_id = data.subject_id
    slot.teacher_id = data.teacher_id
    slot.classroom_name = data.classroom_name.strip() if data.classroom_name else None

    if target_slot is None:
        db.add(slot)
    db.commit()
    db.refresh(slot)

    return {"status": "success", "warnings": warnings, "data": _serialize_slot(slot)}