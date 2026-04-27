from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AcademicSession(Base):
    __tablename__ = "academic_sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "2024/2025"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    terms = relationship("Term", back_populates="session")
    classes = relationship("Class", back_populates="session")
    fee_structures = relationship("FeeStructure", back_populates="session")
    invoices = relationship("Invoice", back_populates="session")
    results = relationship("Result", back_populates="session")


class Term(Base):
    __tablename__ = "terms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # "First Term", "Second Term", "Third Term"
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AcademicSession", back_populates="terms")
    fee_structures = relationship("FeeStructure", back_populates="term")
    invoices = relationship("Invoice", back_populates="term")
    results = relationship("Result", back_populates="term")
