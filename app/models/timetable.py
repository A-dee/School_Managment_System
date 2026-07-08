import enum

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from app.database import Base


class TimetableDay(str, enum.Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"


class TimetablePeriod(Base):
    __tablename__ = "timetable_periods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_academic = Column(Boolean, default=True, nullable=False)

    slots = relationship("TimetableSlot", back_populates="period", cascade="all, delete-orphan")


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(Enum(TimetableDay), nullable=False)
    period_id = Column(Integer, ForeignKey("timetable_periods.id"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True, index=True)
    teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=True, index=True)
    classroom_name = Column(String, nullable=True)

    period = relationship("TimetablePeriod", back_populates="slots")
    class_ = relationship("Class", back_populates="timetable_slots")
    subject = relationship("Subject", back_populates="timetable_slots")
    teacher = relationship("Staff", back_populates="timetable_slots")
