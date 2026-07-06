import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    marked_by_teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="attendance_records")
    class_ = relationship("Class", back_populates="attendance_records")
    marked_by_teacher = relationship("Staff", back_populates="attendance_records")
