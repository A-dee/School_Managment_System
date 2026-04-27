from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel
from app.models.attendance import AttendanceStatus


class AttendanceCreate(BaseModel):
    date: date
    student_id: int
    class_id: int
    status: AttendanceStatus


class BulkAttendanceCreate(BaseModel):
    date: date
    class_id: int
    records: list[dict]  # [{"student_id": 1, "status": "PRESENT"}, ...]


class AttendanceOut(BaseModel):
    id: int
    date: date
    student_id: int
    class_id: int
    marked_by_teacher_id: int
    status: AttendanceStatus
    created_at: datetime

    class Config:
        from_attributes = True
