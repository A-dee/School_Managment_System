import re
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from app.models.staff import StaffType, StaffStatus, StaffGender

_NAME_RE  = re.compile(r"^[A-Za-z\s\-'\.]+$")
_PHONE_RE = re.compile(r"^\+?[\d\s\-\(\)]{7,20}$")


class StaffCreate(BaseModel):
    first_name:      str           = Field(min_length=2, max_length=100)
    last_name:       str           = Field(min_length=2, max_length=100)
    full_name:       Optional[str] = Field(None, min_length=2, max_length=150)
    gender:          StaffGender
    phone_number:    Optional[str] = Field(None, max_length=25)
    email:           EmailStr
    address:         Optional[str] = Field(None, max_length=300)
    employment_date: Optional[date] = None
    salary_amount:   Optional[Decimal] = Decimal("0")
    staff_type:      StaffType
    user_email:      EmailStr
    user_password:   str = Field(min_length=8, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v

    @model_validator(mode="after")
    def set_full_name(self):
        self.full_name = (self.full_name or f"{self.first_name} {self.last_name}").strip()
        return self

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("salary_amount")
    @classmethod
    def validate_salary(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Salary cannot be negative")
        return v


class StaffUpdate(BaseModel):
    first_name:      Optional[str]         = Field(None, min_length=2, max_length=100)
    last_name:       Optional[str]         = Field(None, min_length=2, max_length=100)
    full_name:       Optional[str]         = Field(None, min_length=2, max_length=150)
    gender:          Optional[StaffGender] = None
    phone_number:    Optional[str]         = Field(None, max_length=25)
    address:         Optional[str]         = Field(None, max_length=300)
    employment_date: Optional[date]        = None
    salary_amount:   Optional[Decimal]     = None
    staff_type:      Optional[StaffType]   = None
    status:          Optional[StaffStatus] = None

    @field_validator("first_name", "last_name", "full_name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("salary_amount")
    @classmethod
    def validate_salary(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Salary cannot be negative")
        return v


class StaffOut(BaseModel):
    id:              int
    user_id:         int
    first_name:      Optional[str]
    last_name:       Optional[str]
    full_name:       str
    gender:          Optional[StaffGender]
    phone_number:    Optional[str]
    email:           str
    address:         Optional[str]
    employment_date: Optional[date]
    salary_amount:   Decimal
    staff_type:      StaffType
    status:          StaffStatus
    created_at:      datetime

    class Config:
        from_attributes = True
