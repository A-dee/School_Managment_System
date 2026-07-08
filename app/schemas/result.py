from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
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

    @field_validator("ca_score")
    @classmethod
    def validate_ca_score(cls, value: Decimal) -> Decimal:
        if value < 0 or value > 40:
            raise ValueError("CA score must be between 0 and 40")
        return value

    @field_validator("exam_score")
    @classmethod
    def validate_exam_score(cls, value: Decimal) -> Decimal:
        if value < 0 or value > 60:
            raise ValueError("Exam score must be between 0 and 60")
        return value


class ResultUpdate(BaseModel):
    ca_score: Optional[Decimal] = None
    exam_score: Optional[Decimal] = None
    remarks: Optional[str] = None

    @field_validator("ca_score")
    @classmethod
    def validate_optional_ca_score(cls, value: Optional[Decimal]) -> Optional[Decimal]:
        if value is not None and (value < 0 or value > 40):
            raise ValueError("CA score must be between 0 and 40")
        return value

    @field_validator("exam_score")
    @classmethod
    def validate_optional_exam_score(cls, value: Optional[Decimal]) -> Optional[Decimal]:
        if value is not None and (value < 0 or value > 60):
            raise ValueError("Exam score must be between 0 and 60")
        return value


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
    # Enriched fields (populated by route handlers)
    student_name: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        from_attributes = True


class GradeScaleCreate(BaseModel):
    grade: str
    min_score: Decimal
    remark: str


class GradeScaleOut(BaseModel):
    id: int
    grade: str
    min_score: Decimal
    remark: str

    class Config:
        from_attributes = True

