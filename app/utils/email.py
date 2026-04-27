import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def get_email_config(db: Session):
    from app.models.email_config import EmailConfig
    return db.query(EmailConfig).filter(EmailConfig.is_active == True).first()


def send_email(
    db: Session,
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
) -> bool:
    config = get_email_config(db)
    if not config:
        logger.warning("No email config found — email not sent")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{config.from_name} <{config.smtp_user}>"
        msg["To"] = to_email

        msg.attach(MIMEText(body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
            server.starttls()
            server.login(config.smtp_user, config.smtp_password)
            server.sendmail(config.smtp_user, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_login_credentials(db: Session, to_email: str, full_name: str, password: str, role: str) -> bool:
    subject = "Your School Portal Login Credentials"
    body = f"""Dear {full_name},

Your account has been created on the School Management Portal.

Login Details:
  Email:    {to_email}
  Password: {password}
  Role:     {role}

Please login at your school portal and change your password after first login.

Regards,
School Management System
"""
    html_body = f"""
<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
  <h2 style="color:#1d4ed8;">School Management Portal</h2>
  <p>Dear <strong>{full_name}</strong>,</p>
  <p>Your account has been created. Here are your login details:</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Email</td><td style="padding:8px;">{to_email}</td></tr>
    <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Password</td><td style="padding:8px;">{password}</td></tr>
    <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Role</td><td style="padding:8px;">{role}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:13px;">Please change your password after first login.</p>
</div>
"""
    return send_email(db, to_email, subject, body, html_body)


def send_fee_reminder(db: Session, to_email: str, student_name: str, amount: float, due_date: str) -> bool:
    subject = f"Fee Payment Reminder — {student_name}"
    body = f"Dear Parent,\n\nThis is a reminder that a fee balance of ₦{amount:,.2f} is due by {due_date} for {student_name}.\n\nPlease make payment at the earliest.\n\nRegards,\nSchool Finance Office"
    return send_email(db, to_email, subject, body)


def send_result_notification(db: Session, to_email: str, student_name: str, term: str) -> bool:
    subject = f"Results Published — {student_name}"
    body = f"Dear Parent,\n\nThe {term} results for {student_name} have been published. Please log in to your portal to view them.\n\nRegards,\nSchool Management System"
    return send_email(db, to_email, subject, body)
