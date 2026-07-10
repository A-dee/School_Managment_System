from sqlalchemy import Column, Integer, ForeignKey, JSON
from app.database import Base

class TermInstallmentTemplate(Base):
    __tablename__ = "term_installment_templates"

    id = Column(Integer, primary_key=True, index=True)
    term_id = Column(Integer, ForeignKey("terms.id"), unique=True, nullable=False, index=True)
    milestones = Column(JSON, nullable=False) # List of {"name": str, "percentage": int, "due_date": str}
