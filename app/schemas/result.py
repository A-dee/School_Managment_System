from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from app.models.result import ResultStatus, ExamType


class ResultCreate(BaseModel):
    student_id: int
    subject_id: int
    class_id: int
    session_id: int
    term_id: int
    exam_type: ExamType = ExamType.END_OF_TERM
    ca_score: Decimal = Decimal("0")
    exam_score: Decimal = Decimal("0")


class ResultUpdate(BaseModel):
    ca_score: Optional[Decimal] = None
    exam_score: Optional[Decimal] = None
    remarks: Optional[str] = None


class ResultOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    class_id: int
    session_id: int
    term_id: int
    teacher_id: int
    exam_type: ExamType
    ca_score: Decimal
    exam_score: Decimal
    total_score: Decimal
    grade: Optional[str]
    remarks: Optional[str]
    class_position: Optional[int]
    status: ResultStatus
    created_at: datetime

    class Config:
        from_attributes = True
