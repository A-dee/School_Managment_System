from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email_config import EmailConfig
from app.utils.rbac import is_super_admin
from app.utils.response import success_response
from app.utils.email import send_email

router = APIRouter(prefix="/email-config", tags=["Email Config"])


class EmailConfigCreate(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_name: str = "School Management System"


class EmailConfigOut(BaseModel):
    id: int
    smtp_host: str
    smtp_port: int
    smtp_user: str
    from_name: str
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/")
def set_email_config(data: EmailConfigCreate, db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    existing = db.query(EmailConfig).first()
    if existing:
        existing.smtp_host = data.smtp_host
        existing.smtp_port = data.smtp_port
        existing.smtp_user = data.smtp_user
        existing.smtp_password = data.smtp_password
        existing.from_name = data.from_name
        db.commit()
        return success_response(EmailConfigOut.model_validate(existing).model_dump(), "Email config updated")
    config = EmailConfig(**data.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return success_response(EmailConfigOut.model_validate(config).model_dump(), "Email config saved")


@router.get("/")
def get_config(db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    config = db.query(EmailConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="No email config found")
    return success_response(EmailConfigOut.model_validate(config).model_dump())


@router.post("/test")
def test_email(to_email: str, db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    ok = send_email(db, to_email, "Test Email from SMS", "This is a test email from your School Management System.")
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check your SMTP config.")
    return success_response(None, f"Test email sent to {to_email}")
