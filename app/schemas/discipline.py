from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel


class DisciplineCreate(BaseModel):
    student_id: int
    incident: str
    action_taken: Optional[str] = None
    date: date


class DisciplineUpdate(BaseModel):
    action_taken: Optional[str] = None


class DisciplineOut(BaseModel):
    id: int
    student_id: int
    incident: str
    action_taken: Optional[str]
    reported_by_teacher_id: int
    date: date
    created_at: datetime

    class Config:
        from_attributes = True
