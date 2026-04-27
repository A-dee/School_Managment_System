from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.subject import SubjectStatus


class SubjectCreate(BaseModel):
    name: str
    code: str


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[SubjectStatus] = None


class SubjectOut(BaseModel):
    id: int
    name: str
    code: str
    created_by_teacher_id: Optional[int]
    status: SubjectStatus
    created_at: datetime

    class Config:
        from_attributes = True


class TeacherSubjectClassCreate(BaseModel):
    teacher_id: int
    subject_id: int
    class_id: int


class TeacherSubjectClassOut(BaseModel):
    id: int
    teacher_id: int
    subject_id: int
    class_id: int

    class Config:
        from_attributes = True
