from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr
from app.models.staff import StaffType, StaffStatus


class StaffCreate(BaseModel):
    full_name: str
    phone_number: Optional[str] = None
    email: EmailStr
    address: Optional[str] = None
    employment_date: Optional[date] = None
    salary_amount: Optional[Decimal] = Decimal("0")
    staff_type: StaffType
    user_email: str
    user_password: str


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    employment_date: Optional[date] = None
    salary_amount: Optional[Decimal] = None
    staff_type: Optional[StaffType] = None
    status: Optional[StaffStatus] = None


class StaffOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone_number: Optional[str]
    email: str
    address: Optional[str]
    employment_date: Optional[date]
    salary_amount: Decimal
    staff_type: StaffType
    status: StaffStatus
    created_at: datetime

    class Config:
        from_attributes = True
