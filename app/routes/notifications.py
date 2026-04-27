from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.utils.auth import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def my_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notifications = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return success_response([{
        "id": n.id, "title": n.title, "message": n.message,
        "channel": n.channel.value, "status": n.status.value,
        "is_read": n.is_read, "created_at": str(n.created_at),
    } for n in notifications])


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_user_id == current_user.id
    ).first()
    if n:
        n.is_read = 1
        db.commit()
    return success_response(None, "Marked as read")


def send_notification(db: Session, user_id: int, title: str, message: str, channel: str = "IN_APP"):
    from app.models.notification import NotificationChannel, NotificationStatus
    n = Notification(
        recipient_user_id=user_id,
        title=title,
        message=message,
        channel=NotificationChannel(channel),
        status=NotificationStatus.SENT,
    )
    db.add(n)
    db.flush()
    return n
