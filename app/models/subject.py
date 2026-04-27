import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SubjectStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    created_by_teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    status = Column(Enum(SubjectStatus), default=SubjectStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by_teacher = relationship("Staff")
    assignments = relationship("TeacherSubjectClass", back_populates="subject")
    results = relationship("Result", back_populates="subject")


class TeacherSubjectClass(Base):
    __tablename__ = "teacher_subject_classes"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("Staff", back_populates="subject_assignments")
    subject = relationship("Subject", back_populates="assignments")
    class_ = relationship("Class", back_populates="subject_assignments")
