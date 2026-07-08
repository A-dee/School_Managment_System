import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ResultStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"


class ExamType(str, enum.Enum):
    MID_TERM = "MID_TERM"
    END_OF_TERM = "END_OF_TERM"


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False, index=True)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=False, index=True)
    exam_type = Column(Enum(ExamType), default=ExamType.END_OF_TERM)
    ca_score = Column(Numeric(5, 2), default=0)
    exam_score = Column(Numeric(5, 2), default=0)
    total_score = Column(Numeric(5, 2), default=0)
    grade = Column(String(5), nullable=True)
    remarks = Column(String, nullable=True)
    class_position = Column(Integer, nullable=True)
    status = Column(Enum(ResultStatus), default=ResultStatus.DRAFT)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    student = relationship("Student", back_populates="results")
    subject = relationship("Subject", back_populates="results")
    class_ = relationship("Class", back_populates="results")
    session = relationship("AcademicSession", back_populates="results")
    term = relationship("Term", back_populates="results")
    teacher = relationship("Staff")
