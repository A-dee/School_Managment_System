from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email_config import EmailConfig
from app.utils.rbac import is_super_admin, is_principal_or_above
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


@router.get("/status")
def get_email_status(db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    from app.config import settings
    if settings.RESEND_API_KEY and settings.RESEND_API_KEY != "re_placeholder":
        return success_response({"provider": "resend", "from": settings.EMAIL_FROM})
    config = db.query(EmailConfig).first()
    if config and config.is_active:
        return success_response({"provider": "smtp", "from": config.smtp_user})
    return success_response({"provider": "none", "from": None})


@router.get("/")
def get_config(db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    config = db.query(EmailConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="No email config found")
    return success_response(EmailConfigOut.model_validate(config).model_dump())


@router.post("/test")
def test_email(to_email: str, db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    from app.config import settings as app_settings
    from app.utils.email import get_email_config, _send_via_resend
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    if app_settings.RESEND_API_KEY and app_settings.RESEND_API_KEY != "re_placeholder":
        try:
            _send_via_resend(to_email, "Test Email from SMS", "<p>This is a test email from your School Management System.</p>", raise_on_error=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Resend error: {str(e)}")
        return success_response(None, f"Test email sent via Resend to {to_email}")

    config = get_email_config(db)
    if not config:
        raise HTTPException(status_code=400, detail="No email config saved. Fill in and save the SMTP form first.")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Test Email from SMS"
        msg["From"] = f"{config.from_name} <{config.smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText("This is a test email from your School Management System.", "plain"))

        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config.smtp_user, config.smtp_password)
            server.sendmail(config.smtp_user, to_email, msg.as_string())

        return success_response(None, f"Test email sent via SMTP to {to_email}")
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="Authentication failed — wrong email or app password.")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail=f"Cannot connect to {config.smtp_host}:{config.smtp_port} — server firewall may be blocking SMTP.")
    except smtplib.SMTPRecipientsRefused:
        raise HTTPException(status_code=400, detail=f"Recipient {to_email} was refused by the server.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP error: {str(e)}")


class ComposeEmail(BaseModel):
    to_email: EmailStr
    subject: str
    body: str


@router.post("/compose")
def compose_email(data: ComposeEmail, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    from app.config import settings as app_settings
    from app.utils.email import _send_via_resend, get_email_config
    try:
        if app_settings.RESEND_API_KEY and app_settings.RESEND_API_KEY != "re_placeholder":
            _send_via_resend(data.to_email, data.subject, f"<div style='font-family:sans-serif;white-space:pre-wrap'>{data.body}</div>", raise_on_error=True)
        else:
            config = get_email_config(db)
            if not config:
                raise HTTPException(status_code=400, detail="No email provider configured. Add RESEND_API_KEY to your environment or save SMTP settings.")
            ok = send_email(db, data.to_email, data.subject, data.body)
            if not ok:
                raise HTTPException(status_code=500, detail="SMTP send failed — check your SMTP credentials in Settings.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email error: {str(e)}")
    return success_response(None, f"Email sent to {data.to_email}")
