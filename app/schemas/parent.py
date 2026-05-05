import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator

_NAME_RE  = re.compile(r"^[A-Za-z\s\-'\.]+$")
_PHONE_RE = re.compile(r"^\+?[\d\s\-\(\)]{7,20}$")


class ParentCreate(BaseModel):
    full_name:     str           = Field(min_length=2, max_length=150)
    phone:         Optional[str] = Field(None, max_length=25)
    email:         Optional[EmailStr] = None
    address:       Optional[str] = Field(None, max_length=300)
    user_email:    EmailStr
    user_password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v


class ParentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone:     Optional[str] = Field(None, max_length=25)
    address:   Optional[str] = Field(None, max_length=300)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v


class ParentOut(BaseModel):
    id:         int
    user_id:    int
    full_name:  str
    phone:      Optional[str]
    email:      Optional[str]
    address:    Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LinkParentStudent(BaseModel):
    parent_id:  int = Field(gt=0)
    student_id: int = Field(gt=0)
