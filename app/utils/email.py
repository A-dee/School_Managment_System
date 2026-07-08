import logging
import os
import smtplib
import subprocess
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger(__name__)



def _send_via_php_mailer(to_email: str, subject: str, plain_body: str, html_body: str) -> bool:
    script_path = Path(__file__).with_name("mail.php")
    body = html_body or f"<pre style='font-family:sans-serif'>{plain_body}</pre>"
    env = os.environ.copy()
    env["SMTP_HOST"] = settings.SMTP_HOST
    env["SMTP_PORT"] = str(settings.SMTP_PORT)
    env["SMTP_USER"] = settings.SMTP_USER
    env["SMTP_PASSWORD"] = settings.SMTP_PASSWORD
    env["SMTP_SECURE"] = settings.SMTP_SECURE
    env["EMAIL_FROM"] = settings.EMAIL_FROM

    try:
        result = subprocess.run(
            [
                "php",
                str(script_path),
                "--to",
                to_email,
                "--subject",
                subject,
                "--body",
                body,
                "--text",
                plain_body,
            ],
            shell=False,
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
        )
    except FileNotFoundError:
        logger.error("PHP executable not found; unable to send email to %s", to_email)
        return False
    except subprocess.TimeoutExpired:
        logger.error("PHP mailer timed out while sending email to %s", to_email)
        return False

    if result.returncode != 0:
        logger.error(
            "PHP mailer failed to=%s subject=%s returncode=%s stderr=%s stdout=%s",
            to_email,
            subject,
            result.returncode,
            result.stderr.strip(),
            result.stdout.strip(),
        )
        return False

    logger.info("PHP mailer sent to=%s subject=%s", to_email, subject)
    return True


def _dispatch(
    db: Optional[Session],
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str,
) -> bool:
    """
    Dispatch email using the PHP SMTP mailer first. If that is unavailable,
    fall back to DB-backed SMTP for flows that still pass a database session.
    """
    if _send_via_php_mailer(to_email, subject, plain_body, html_body):
        return True
    if db is not None:
        return send_email(db, to_email, subject, plain_body, html_body)
    logger.info("[DEV EMAIL] to=%s | %s\n%s", to_email, subject, plain_body)
    return True


def get_email_config(db: Session):
    from app.models.email_config import EmailConfig

    return db.query(EmailConfig).filter(EmailConfig.is_active == True).first()


def _send_via_smtp(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    from_name: str,
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain"))
    if html_body:
        msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())
    return True


def send_email(
    db: Session,
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
) -> bool:

    config = get_email_config(db)
    if not config:
        logger.warning("No email config found - email not sent")
        return False

    try:
        _send_via_smtp(
            config.smtp_host,
            config.smtp_port,
            config.smtp_user,
            config.smtp_password,
            config.from_name,
            to_email,
            subject,
            body,
            html_body,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
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
    subject = f"Fee Payment Reminder - {student_name}"
    body = (
        f"Dear Parent,\n\nThis is a reminder that a fee balance of N{amount:,.2f} "
        f"is due by {due_date} for {student_name}.\n\nPlease make payment at the earliest."
        "\n\nRegards,\nSchool Finance Office"
    )
    return send_email(db, to_email, subject, body)


def send_result_notification(db: Session, to_email: str, student_name: str, term: str) -> bool:
    subject = f"Results Published - {student_name}"
    body = (
        f"Dear Parent,\n\nThe {term} results for {student_name} have been published. "
        "Please log in to your portal to view them.\n\nRegards,\nSchool Management System"
    )
    return send_email(db, to_email, subject, body)


def send_password_reset_email(
    to_email: str, reset_token: str, user_name: str = "", db: Optional[Session] = None
) -> bool:
    # Build a stable reset URL even if the configured frontend origin includes a trailing slash.
    reset_url = f"{settings.frontend_url_normalized}/reset-password?token={reset_token}"
    greeting = f"Hi {user_name}," if user_name else "Hello,"
    subject = "Reset Your Password - Lenage Management Systems"
    plain = (
        f"{greeting}\n\n"
        "Use this one-time reset token to create a new password:\n"
        f"{reset_token}\n\n"
        f"You can also reset directly with this link:\n{reset_url}\n\n"
        "This token expires in 1 hour. If you didn't request this, ignore this email."
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;
                background:#f8fafc;border-radius:12px">
      <h2 style="color:#0f172a;margin-bottom:8px">Password Reset Request</h2>
      <p style="color:#475569;margin-bottom:24px">
        {greeting}<br><br>
        We received a request to reset your portal password.
        Use the one-time token below or click the button.
        It expires in <strong>1 hour</strong>.
      </p>
      <div style="margin:0 0 24px;padding:16px 18px;background:#e2e8f0;border-radius:10px">
        <div style="font-size:0.78rem;color:#475569;margin-bottom:6px">One-time reset token</div>
        <div style="font-size:1.1rem;font-weight:800;letter-spacing:0.08em;color:#0f172a;word-break:break-all">
          {reset_token}
        </div>
      </div>
      <p style="color:#475569;margin-bottom:24px">
        If your email app blocks the button, open the reset page and paste the token manually.
      </p>
      <a href="{reset_url}"
         style="display:inline-block;padding:12px 28px;background:#2563eb;
                color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
        Reset Password
      </a>
      <p style="color:#94a3b8;font-size:0.8rem;margin-top:24px">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>"""
    return _dispatch(db, to_email, subject, plain, html)


def send_payment_confirmation_email(
    to_email: str,
    student_name: str,
    amount: float,
    receipt_number: str,
    term_name: str,
    db: Optional[Session] = None,
) -> bool:
    fmt = f"{amount:,.2f}"
    subject = f"Payment Confirmed - N{fmt} for {student_name}"
    plain = (
        f"Dear Parent,\n\nA payment of N{fmt} has been recorded for {student_name}.\n"
        f"Receipt: {receipt_number} | Term: {term_name}\n\n"
        "Please keep this email as proof of payment.\n\nRegards,\nSchool Finance Office"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;
                background:#f8fafc;border-radius:12px">
      <h2 style="color:#15803d;margin-bottom:4px">&#10003; Payment Confirmed</h2>
      <p style="color:#475569;margin-bottom:20px">
        A school-fee payment has been recorded for <strong>{student_name}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 0;color:#64748b">Amount</td>
          <td style="padding:10px 0;font-weight:700;color:#0f172a">N{fmt}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 0;color:#64748b">Receipt No.</td>
          <td style="padding:10px 0;font-weight:700;color:#0f172a">{receipt_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b">Term</td>
          <td style="padding:10px 0;color:#0f172a">{term_name}</td>
        </tr>
      </table>
      <p style="color:#94a3b8;font-size:0.8rem">
        For queries contact the school office.
      </p>
    </div>"""
    return _dispatch(db, to_email, subject, plain, html)
