from datetime import date as date_type
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.announcement import Announcement, AnnouncementType
from app.models.user import UserRole
from app.utils.rbac import is_principal_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/announcements", tags=["Announcements"])

_ROLE_ALIASES = {
    UserRole.STUDENT:            "STUDENT",
    UserRole.TEACHER:            "TEACHER",
    UserRole.NON_TEACHING_STAFF: "TEACHER",
    UserRole.ADMIN:              "TEACHER",
    UserRole.PRINCIPAL:          "TEACHER",
    UserRole.SUPER_ADMIN:        "TEACHER",
    UserRole.PARENT:             "PARENT",
}


class AnnouncementIn(BaseModel):
    title:        str = Field(min_length=1, max_length=200)
    message:      str = Field(min_length=1, max_length=2000)
    type:         AnnouncementType = AnnouncementType.NOTICE
    event_date:   Optional[date_type] = None
    target_roles: str = Field(default="ALL", max_length=50)


def _serialize(a: Announcement) -> dict:
    return {
        "id":           a.id,
        "title":        a.title,
        "message":      a.message,
        "type":         a.type.value,
        "event_date":   str(a.event_date) if a.event_date else None,
        "target_roles": a.target_roles,
        "created_by":   a.created_by,
        "creator_name": a.creator.email if a.creator else None,
        "created_at":   str(a.created_at),
    }


@router.post("/")
def create_announcement(
    data: AnnouncementIn,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
):
    ann = Announcement(
        title=data.title,
        message=data.message,
        type=data.type,
        event_date=data.event_date,
        target_roles=data.target_roles,
        created_by=current_user.id,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return success_response(_serialize(ann), "Announcement created")


@router.get("/")
def list_announcements(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns announcements visible to the current user's role."""
    role_tag = _ROLE_ALIASES.get(current_user.role, "TEACHER")
    anns = (
        db.query(Announcement)
        .filter(
            (Announcement.target_roles == "ALL")
            | Announcement.target_roles.contains(role_tag)
        )
        .order_by(Announcement.created_at.desc())
        .limit(100)
        .all()
    )
    return success_response([_serialize(a) for a in anns])


@router.delete("/{ann_id}")
def delete_announcement(
    ann_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
):
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return success_response(None, "Announcement deleted")
