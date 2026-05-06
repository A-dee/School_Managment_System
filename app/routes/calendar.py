from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.calendar import SchoolEvent, EventType
from app.utils.rbac import is_admin_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response
from app.utils.audit import log_action

router = APIRouter(prefix="/calendar", tags=["Calendar"])


class EventCreate(BaseModel):
    title:       str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    start_date:  date
    end_date:    Optional[date] = None
    event_type:  EventType = EventType.OTHER
    is_public:   bool = True


class EventUpdate(BaseModel):
    title:       Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    start_date:  Optional[date] = None
    end_date:    Optional[date] = None
    event_type:  Optional[EventType] = None
    is_public:   Optional[bool] = None


def _out(e: SchoolEvent) -> dict:
    return {
        "id":          e.id,
        "title":       e.title,
        "description": e.description,
        "start_date":  e.start_date.isoformat() if e.start_date else None,
        "end_date":    e.end_date.isoformat() if e.end_date else None,
        "event_type":  e.event_type,
        "is_public":   e.is_public,
        "created_by":  e.created_by,
        "created_at":  e.created_at.isoformat() if e.created_at else None,
    }


@router.get("/")
def list_events(
    year:  Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(SchoolEvent)
    if year:
        from sqlalchemy import extract
        q = q.filter(extract("year", SchoolEvent.start_date) == year)
    if month:
        from sqlalchemy import extract
        q = q.filter(extract("month", SchoolEvent.start_date) == month)
    events = q.order_by(SchoolEvent.start_date.asc()).all()
    return success_response([_out(e) for e in events])


@router.post("/")
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    if data.end_date and data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    event = SchoolEvent(
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        event_type=data.event_type,
        is_public=data.is_public,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()
    log_action(db, "CREATE_EVENT", "SchoolEvent", current_user.id, entity_id=event.id)
    db.commit()
    db.refresh(event)
    return success_response(_out(event), "Event created")


@router.put("/{event_id}")
def update_event(
    event_id: int,
    data: EventUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    event = db.query(SchoolEvent).filter(SchoolEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    if event.end_date and event.end_date < event.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    log_action(db, "UPDATE_EVENT", "SchoolEvent", current_user.id, entity_id=event_id)
    db.commit()
    db.refresh(event)
    return success_response(_out(event), "Event updated")


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    event = db.query(SchoolEvent).filter(SchoolEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    log_action(db, "DELETE_EVENT", "SchoolEvent", current_user.id, entity_id=event_id)
    db.delete(event)
    db.commit()
    return success_response(None, "Event deleted")
