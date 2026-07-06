import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole

_STRONG_PW_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def _validate_password(v: str) -> str:
    if not _STRONG_PW_RE.match(v):
        raise ValueError("Password must be at least 8 characters and contain both letters and numbers")
    return v


class UserCreate(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=8, max_length=128)
    role:     UserRole

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class UserUpdate(BaseModel):
    email:     Optional[EmailStr] = None
    is_active: Optional[bool]     = None


class UserOut(BaseModel):
    id:          int
    email:       str
    role:        UserRole
    is_active:   bool
    is_verified: bool
    created_at:  datetime

    class Config:
        from_attributes = True


class PasswordReset(BaseModel):
    token:        str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password:     str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class ForgotPassword(BaseModel):
    email: EmailStr


class AdminPasswordReset(BaseModel):
    admin_password: str = Field(min_length=1, max_length=128)
    new_password:   str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)
