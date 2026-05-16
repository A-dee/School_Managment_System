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
from app.routes.notifications import send_bulk_notifications

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

_MANAGEMENT_ROLES = {UserRole.SUPER_ADMIN, UserRole.PRINCIPAL}
_AUDIENCE_ORDER = ["STUDENT", "TEACHER", "PARENT"]
_VALID_AUDIENCE_SETS = {
    frozenset(),
    frozenset({"STUDENT"}),
    frozenset({"TEACHER"}),
    frozenset({"PARENT"}),
    frozenset({"STUDENT", "PARENT"}),
    frozenset({"STUDENT", "TEACHER"}),
    frozenset({"TEACHER", "PARENT"}),
    frozenset({"STUDENT", "TEACHER", "PARENT"}),
}


class AnnouncementIn(BaseModel):
    title:        str = Field(min_length=1, max_length=200)
    message:      str = Field(min_length=1, max_length=2000)
    type:         AnnouncementType = AnnouncementType.NOTICE
    event_date:   Optional[date_type] = None
    target_roles: str = Field(default="ALL", max_length=50)


def _normalize_target_roles(raw: str) -> str:
    # Store audience selections in one normalized format so filtering stays predictable.
    roles = [part.strip().upper() for part in raw.split(",") if part.strip()]
    if not roles:
        return "ALL"
    if "ALL" in roles:
        return "ALL"
    role_set = frozenset(roles)
    if role_set not in _VALID_AUDIENCE_SETS:
        raise HTTPException(status_code=422, detail="Invalid announcement audience")
    normalized_roles = [role for role in _AUDIENCE_ORDER if role in role_set]
    return ",".join(normalized_roles)


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


def _get_announcement_recipient_ids(db: Session, target_roles: str) -> set[int]:
    from app.models.user import User

    normalized = _normalize_target_roles(target_roles)
    if normalized == "ALL":
        users = db.query(User).filter(User.is_active == True).all()
        return {u.id for u in users}

    allowed = set(normalized.split(","))
    recipients = set()
    for user in db.query(User).filter(User.is_active == True).all():
        role_tag = _ROLE_ALIASES.get(user.role, "TEACHER")
        if role_tag in allowed:
            recipients.add(user.id)
    return recipients


@router.post("/")
def create_announcement(
    data: AnnouncementIn,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
):
    target_roles = _normalize_target_roles(data.target_roles)
    if data.type in {AnnouncementType.EVENT, AnnouncementType.HOLIDAY} and not data.event_date:
        raise HTTPException(status_code=422, detail="event_date is required for events and holidays")

    ann = Announcement(
        title=data.title,
        message=data.message,
        type=data.type,
        event_date=data.event_date,
        target_roles=target_roles,
        created_by=current_user.id,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    message = data.message[:180] if len(data.message) > 180 else data.message
    send_bulk_notifications(db, _get_announcement_recipient_ids(db, target_roles), f"Announcement: {data.title}", message)
    db.commit()
    return success_response(_serialize(ann), "Announcement created")


@router.get("/")
def list_announcements(
    include_all: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns announcements visible to the current user's role."""
    if include_all:
        # The management page needs the full list, not just the current user's audience slice.
        if current_user.role not in _MANAGEMENT_ROLES:
            raise HTTPException(status_code=403, detail="Access denied")
        anns = (
            db.query(Announcement)
            .order_by(Announcement.created_at.desc())
            .limit(100)
            .all()
        )
        return success_response([_serialize(a) for a in anns])

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
