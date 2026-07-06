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


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    count = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id,
        Notification.is_read == 0,
    ).count()
    return success_response({"unread": count})


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


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    unread_items = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id,
        Notification.is_read == 0,
    ).all()
    for item in unread_items:
        item.is_read = 1
    db.commit()
    return success_response({"marked": len(unread_items)}, "All notifications marked as read")


@router.delete("/clear-read")
def clear_read_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    read_items = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id,
        Notification.is_read == 1,
    ).all()
    for item in read_items:
        db.delete(item)
    db.commit()
    return success_response({"cleared": len(read_items)}, "Viewed notifications cleared")


@router.delete("/{notification_id}")
def clear_notification(notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_user_id == current_user.id,
    ).first()
    if not n:
        return success_response(None, "Notification already cleared")
    if not n.is_read:
        n.is_read = 1
        db.flush()
    db.delete(n)
    db.commit()
    return success_response(None, "Notification cleared")


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


def send_bulk_notifications(db: Session, user_ids: list[int] | set[int], title: str, message: str, channel: str = "IN_APP"):
    sent: list[Notification] = []
    for user_id in sorted({uid for uid in user_ids if uid}):
        sent.append(send_notification(db, user_id, title, message, channel))
    return sent
