import re
from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator, EmailStr
from app.models.student import StudentStatus, Gender

_NAME_RE    = re.compile(r"^[A-Za-z\s\-'\.]+$")
_PHONE_RE   = re.compile(r"^\+?[\d\s\-\(\)]{7,20}$")
_ADMNO_RE   = re.compile(r"^[A-Za-z0-9\-/]+$")


class StudentCreate(BaseModel):
    admission_number:  str = Field(min_length=1, max_length=50)
    first_name:        str = Field(min_length=1, max_length=100)
    last_name:         str = Field(min_length=1, max_length=100)
    gender:            Gender
    date_of_birth:     Optional[date] = None
    address:           Optional[str] = Field(None, max_length=500)
    guardian_name:     Optional[str] = Field(None, max_length=200)
    guardian_phone:    Optional[str] = Field(None, max_length=25)
    guardian_email:    Optional[str] = Field(None, max_length=200)
    enrollment_date:   Optional[date] = None
    current_class_id:  Optional[int] = Field(None, gt=0)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v

    @field_validator("admission_number")
    @classmethod
    def validate_admission_number(cls, v: str) -> str:
        v = v.strip().upper()
        if not _ADMNO_RE.match(v):
            raise ValueError("Admission number may only contain letters, numbers, hyphens and slashes")
        return v

    @field_validator("guardian_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("guardian_email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if v and "@" not in v:
            raise ValueError("Invalid email address")
        return v


class StudentUpdate(BaseModel):
    first_name:       Optional[str] = Field(None, min_length=1, max_length=100)
    last_name:        Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth:    Optional[date] = None
    address:          Optional[str] = Field(None, max_length=500)
    guardian_name:    Optional[str] = Field(None, max_length=200)
    guardian_phone:   Optional[str] = Field(None, max_length=25)
    current_class_id: Optional[int] = Field(None, gt=0)
    status:           Optional[StudentStatus] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v


class StudentOut(BaseModel):
    id:               int
    admission_number: str
    first_name:       str
    last_name:        str
    gender:           Gender
    date_of_birth:    Optional[date]
    address:          Optional[str]
    guardian_name:    Optional[str]
    guardian_phone:   Optional[str]
    enrollment_date:  Optional[date]
    current_class_id: Optional[int]
    status:           StudentStatus
    created_at:       datetime

    class Config:
        from_attributes = True


class StudentTransfer(BaseModel):
    new_class_id: int = Field(gt=0)


class BulkPromotion(BaseModel):
    from_class_id: int = Field(gt=0)
    to_class_id:   int = Field(gt=0)
    student_ids:   list[int] = Field(min_length=1)
