from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)          # e.g., "JSS1A"
    level = Column(String, nullable=False)          # e.g., "JSS1"
    capacity = Column(Integer, nullable=True)
    class_teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=True, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    class_teacher = relationship("Staff", back_populates="classes_taught", foreign_keys=[class_teacher_id])
    session = relationship("AcademicSession", back_populates="classes")
    students = relationship("Student", back_populates="current_class")
    subject_assignments = relationship("TeacherSubjectClass", back_populates="class_")
    fee_structures = relationship("FeeStructure", back_populates="class_")
    invoices = relationship("Invoice", back_populates="class_")
    results = relationship("Result", back_populates="class_")
    attendance_records = relationship("Attendance", back_populates="class_")
    timetable_slots = relationship("TimetableSlot", back_populates="class_")
