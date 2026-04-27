from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel
from app.models.student import StudentStatus, Gender


class StudentCreate(BaseModel):
    admission_number: str
    first_name: str
    last_name: str
    gender: Gender
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    enrollment_date: Optional[date] = None
    current_class_id: Optional[int] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    current_class_id: Optional[int] = None
    status: Optional[StudentStatus] = None


class StudentOut(BaseModel):
    id: int
    admission_number: str
    first_name: str
    last_name: str
    gender: Gender
    date_of_birth: Optional[date]
    address: Optional[str]
    guardian_name: Optional[str]
    guardian_phone: Optional[str]
    enrollment_date: Optional[date]
    current_class_id: Optional[int]
    status: StudentStatus
    created_at: datetime

    class Config:
        from_attributes = True


class StudentTransfer(BaseModel):
    new_class_id: int


class BulkPromotion(BaseModel):
    from_class_id: int
    to_class_id: int
    student_ids: list[int]
