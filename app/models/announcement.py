import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AnnouncementType(str, enum.Enum):
    EVENT   = "EVENT"
    HOLIDAY = "HOLIDAY"
    NOTICE  = "NOTICE"


class Announcement(Base):
    __tablename__ = "announcements"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String, nullable=False)
    message      = Column(Text, nullable=False)
    type         = Column(Enum(AnnouncementType), default=AnnouncementType.NOTICE)
    event_date   = Column(Date, nullable=True)          # for HOLIDAY / EVENT
    target_roles = Column(String, default="ALL")        # "ALL" | "STUDENT" | "TEACHER" | "STUDENT,TEACHER"
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")
