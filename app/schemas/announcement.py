from datetime import date as date_type, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.announcement import AnnouncementPriority, AnnouncementType


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)
    type: AnnouncementType = AnnouncementType.NOTICE
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
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
    priority: AnnouncementPriority
    event_date: Optional[date_type]
    target_roles: str
    created_by: int
    creator_name: Optional[str]
    created_at: datetime
    source: str = "ANNOUNCEMENT"
    source_id: Optional[int] = None
    can_delete: bool = True

    class Config:
        from_attributes = True
