from datetime import date as date_type, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.announcement import AnnouncementType


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)
    type: AnnouncementType = AnnouncementType.NOTICE
    event_date: Optional[date_type] = None
    target_roles: str = Field(default="ALL", max_length=50)

    @field_validator("title", "message")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value must not be empty")
        return value

    @field_validator("target_roles")
    @classmethod
    def normalize_target_roles_text(cls, value: str) -> str:
        return value.strip().upper() or "ALL"


class AnnouncementOut(BaseModel):
    id: int
    title: str
    message: str
    type: AnnouncementType
    event_date: Optional[date_type]
    target_roles: str
    created_by: int
    creator_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
