import enum
from sqlalchemy import Column, Integer, String, Date, Text, Enum, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class EventType(str, enum.Enum):
    HOLIDAY = "HOLIDAY"
    EXAM = "EXAM"
    MEETING = "MEETING"
    ACTIVITY = "ACTIVITY"
    OTHER = "OTHER"


class SchoolEvent(Base):
    __tablename__ = "school_events"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date  = Column(Date, nullable=False)
    end_date    = Column(Date, nullable=True)
    event_type  = Column(Enum(EventType), default=EventType.OTHER, nullable=False)
    is_public   = Column(Boolean, default=True, nullable=False)
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
