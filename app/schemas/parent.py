from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class ParentCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    user_email: str
    user_password: str


class ParentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class ParentOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LinkParentStudent(BaseModel):
    parent_id: int
    student_id: int
