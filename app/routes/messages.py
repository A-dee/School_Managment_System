from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.message import Message
from app.models.user import User, UserRole
from app.utils.auth import get_current_user
from app.utils.rbac import is_principal_or_above
from app.utils.response import success_response, paginated_response
from app.utils.limiter import limiter
from app.routes.notifications import send_notification

router = APIRouter(prefix="/messages", tags=["Messaging"])


class MessageCreate(BaseModel):
    recipient_user_id: int = Field(gt=0)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)
    parent_message_id: Optional[int] = Field(None, gt=0)


def _fmt(m: Message) -> dict:
    return {
        "id": m.id,
        "sender_user_id": m.sender_user_id,
        "sender_name": m.sender.staff.full_name if (m.sender and m.sender.staff) else
                       m.sender.parent.full_name if (m.sender and m.sender.parent) else
                       (m.sender.email if m.sender else "Unknown"),
        "sender_email": m.sender.email if m.sender else None,
        "recipient_user_id": m.recipient_user_id,
        "recipient_name": m.recipient.staff.full_name if (m.recipient and m.recipient.staff) else
                          m.recipient.parent.full_name if (m.recipient and m.recipient.parent) else
                          (m.recipient.email if m.recipient else "Unknown"),
        "recipient_email": m.recipient.email if m.recipient else None,
        "subject": m.subject,
        "body": m.body,
        "is_read": m.is_read,
        "parent_message_id": m.parent_message_id,
        "created_at": str(m.created_at),
    }


def _get_allowed_recipient_ids(db: Session, current_user: User) -> set[int] | None:
    """
    Returns the set of user IDs the current user is allowed to message.
    Returns None if there is no restriction (SUPER_ADMIN).
    """
    role = current_user.role

    if role == UserRole.SUPER_ADMIN:
        return None  # unrestricted

    if role == UserRole.PRINCIPAL:
        # Can message: all parents, all staff (teacher/admin/non-teaching), and super admin
        allowed_roles = {
            UserRole.PARENT, UserRole.TEACHER, UserRole.ADMIN,
            UserRole.NON_TEACHING_STAFF, UserRole.SUPER_ADMIN,
        }
        ids = {u.id for u in db.query(User).filter(User.role.in_(allowed_roles), User.is_active == True).all()}
        return ids

    if role == UserRole.PARENT:
        from app.models.parent import Parent, ParentStudent
        from app.models.student import Student
        from app.models.class_ import Class
        from app.models.staff import Staff

        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            return set()

        # Collect class teacher user_ids for all their children
        teacher_user_ids: set[int] = set()
        links = db.query(ParentStudent).filter(ParentStudent.parent_id == parent.id).all()
        for link in links:
            student = db.query(Student).filter(Student.id == link.student_id).first()
            if student and student.current_class_id:
                cls = db.query(Class).filter(Class.id == student.current_class_id).first()
                if cls and cls.class_teacher_id:
                    teacher = db.query(Staff).filter(Staff.id == cls.class_teacher_id).first()
                    if teacher and teacher.user_id:
                        teacher_user_ids.add(teacher.user_id)

        # Add the principal(s)
        principal_ids = {
            u.id for u in db.query(User).filter(
                User.role == UserRole.PRINCIPAL, User.is_active == True
            ).all()
        }
        return teacher_user_ids | principal_ids

    if role == UserRole.STUDENT:
        from app.models.student import Student
        from app.models.class_ import Class
        from app.models.staff import Staff

        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return set()

        allowed_ids: set[int] = set()
        if student.current_class_id:
            cls = db.query(Class).filter(Class.id == student.current_class_id).first()
            if cls and cls.class_teacher_id:
                teacher = db.query(Staff).filter(Staff.id == cls.class_teacher_id).first()
                if teacher and teacher.user_id:
                    allowed_ids.add(teacher.user_id)

        admin_ids = {
            u.id for u in db.query(User).filter(
                User.role.in_([UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN]),
                User.is_active == True,
            ).all()
        }
        return allowed_ids | admin_ids

    # Teachers and other non-parent staff route conversations through school
    # leadership instead of opening unrestricted direct messaging.
    if role in (UserRole.TEACHER, UserRole.ADMIN, UserRole.NON_TEACHING_STAFF):
        principal_ids = {
            u.id for u in db.query(User).filter(
                User.role.in_([UserRole.PRINCIPAL, UserRole.SUPER_ADMIN]), User.is_active == True
            ).all()
        }
        return principal_ids

    return set()


def _get_thread_root(db: Session, message_id: int) -> Message | None:
    # Thread views always anchor on the top-level message so replies stay grouped together.
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        return None
    if msg.parent_message_id:
        return db.query(Message).filter(Message.id == msg.parent_message_id).first()
    return msg


@router.get("/contacts")
def get_contacts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns the list of users the current user is allowed to message."""
    allowed_ids = _get_allowed_recipient_ids(db, current_user)

    if allowed_ids is None:
        # SUPER_ADMIN: return all active users except themselves
        users = db.query(User).filter(User.is_active == True, User.id != current_user.id).all()
    elif not allowed_ids:
        return success_response([])
    else:
        allowed_ids.discard(current_user.id)
        users = db.query(User).filter(User.id.in_(allowed_ids)).all()

    contacts = []
    for u in users:
        name = u.email
        if u.staff:
            name = u.staff.full_name
        elif u.parent:
            name = u.parent.full_name
        contacts.append({
            "user_id": u.id,
            "name": name,
            "email": u.email,
            "role": u.role.value,
        })
    contacts.sort(key=lambda c: c["name"])
    return success_response(contacts)


@router.post("/")
@limiter.limit("20/minute")
def send_message(request: Request, data: MessageCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Enforce messaging restrictions
    allowed_ids = _get_allowed_recipient_ids(db, current_user)
    if allowed_ids is not None and data.recipient_user_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="You are not allowed to message this person")
    if data.recipient_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself")

    recipient = db.query(User).filter(User.id == data.recipient_user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    msg = Message(
        sender_user_id=current_user.id,
        recipient_user_id=data.recipient_user_id,
        subject=data.subject,
        body=data.body,
        parent_message_id=data.parent_message_id,
    )
    db.add(msg)
    db.flush()
    send_notification(db, data.recipient_user_id, f"New message: {data.subject}", data.body[:100])
    db.commit()
    return success_response(_fmt(msg), "Message sent")


@router.get("/inbox")
def inbox(skip: int = 0, limit: int = 30, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Message).filter(
        Message.recipient_user_id == current_user.id,
        Message.parent_message_id == None,
    ).order_by(Message.created_at.desc())
    total = q.count()
    msgs = q.offset(skip).limit(limit).all()
    return paginated_response([_fmt(m) for m in msgs], total, skip // limit + 1, limit)


@router.get("/sent")
def sent(skip: int = 0, limit: int = 30, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Message).filter(
        Message.sender_user_id == current_user.id,
        Message.parent_message_id == None,
    ).order_by(Message.created_at.desc())
    total = q.count()
    msgs = q.offset(skip).limit(limit).all()
    return paginated_response([_fmt(m) for m in msgs], total, skip // limit + 1, limit)


@router.get("/unread/count")
def unread_count(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    count = db.query(Message).filter(
        Message.recipient_user_id == current_user.id,
        Message.is_read == False,
    ).count()
    return success_response({"unread": count})


@router.get("/{message_id}")
def get_message(message_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    msg = _get_thread_root(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.recipient_user_id != current_user.id and msg.sender_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if msg.recipient_user_id == current_user.id and not msg.is_read:
        msg.is_read = True
        db.commit()
    replies = db.query(Message).filter(Message.parent_message_id == msg.id).order_by(Message.created_at).all()
    return success_response({**_fmt(msg), "replies": [_fmt(r) for r in replies]})


@router.post("/{message_id}/reply")
def reply(message_id: int, data: MessageCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    original = _get_thread_root(db, message_id)
    if not original:
        raise HTTPException(status_code=404, detail="Message not found")
    if original.recipient_user_id != current_user.id and original.sender_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    # Replies should always go back to the other participant in the thread, never to an arbitrary user id.
    recipient_user_id = original.sender_user_id if original.recipient_user_id == current_user.id else original.recipient_user_id
    if recipient_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Invalid reply recipient")
    reply_msg = Message(
        sender_user_id=current_user.id,
        recipient_user_id=recipient_user_id,
        subject=f"Re: {original.subject}",
        body=data.body,
        parent_message_id=original.id,
    )
    db.add(reply_msg)
    db.flush()
    send_notification(db, recipient_user_id, f"Reply: {original.subject}", data.body[:100])
    db.commit()
    return success_response(_fmt(reply_msg), "Reply sent")


# ── Broadcast messaging ────────────────────────────────────────────────────────

_BROADCAST_TYPES = {"role", "class", "class_parents"}


class BroadcastCreate(BaseModel):
    target_type:  str = Field(min_length=1, max_length=20)
    target_value: str = Field(min_length=1, max_length=100)
    subject:      str = Field(min_length=1, max_length=200)
    body:         str = Field(min_length=1, max_length=5000)

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, v: str) -> str:
        if v not in _BROADCAST_TYPES:
            raise ValueError(f"target_type must be one of: {', '.join(_BROADCAST_TYPES)}")
        return v


def _get_broadcast_recipients(db: Session, target_type: str, target_value: str, sender_id: int) -> list[User]:
    from app.models.student import Student
    from app.models.parent import Parent, ParentStudent
    from app.models.class_ import Class

    if target_type == "role":
        try:
            role = UserRole(target_value)
        except ValueError:
            return []
        return db.query(User).filter(
            User.role == role, User.is_active == True, User.id != sender_id
        ).all()

    if target_type == "class":
        # All students in the class who have user accounts
        students = db.query(Student).filter(Student.current_class_id == int(target_value)).all()
        user_ids = {s.user_id for s in students if getattr(s, "user_id", None)}
        if not user_ids:
            return []
        return db.query(User).filter(User.id.in_(user_ids), User.id != sender_id).all()

    if target_type == "class_parents":
        # Parents of all students in the class
        students = db.query(Student).filter(Student.current_class_id == int(target_value)).all()
        parent_ids: set[int] = set()
        for s in students:
            links = db.query(ParentStudent).filter(ParentStudent.student_id == s.id).all()
            for lnk in links:
                parent = db.query(Parent).filter(Parent.id == lnk.parent_id).first()
                if parent and parent.user_id:
                    parent_ids.add(parent.user_id)
        if not parent_ids:
            return []
        return db.query(User).filter(User.id.in_(parent_ids), User.id != sender_id).all()

    return []


@router.get("/broadcast-groups")
def get_broadcast_groups(db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    from app.models.class_ import Class
    from app.models.student import Student

    groups = []

    # Role-based groups
    role_groups = [
        ("role", UserRole.PARENT,             "All Parents"),
        ("role", UserRole.TEACHER,            "All Teachers"),
        ("role", UserRole.STUDENT,            "All Students"),
        ("role", UserRole.NON_TEACHING_STAFF, "All Non-Teaching Staff"),
        ("role", UserRole.ADMIN,              "All Admin"),
    ]
    for ttype, role, label in role_groups:
        count = db.query(User).filter(User.role == role, User.is_active == True).count()
        if count > 0:
            groups.append({"type": ttype, "value": role.value, "label": label, "count": count})

    # Class-based groups
    classes = db.query(Class).order_by(Class.name).all()
    for cls in classes:
        student_count = db.query(Student).filter(Student.current_class_id == cls.id).count()
        if student_count > 0:
            groups.append({
                "type": "class_parents",
                "value": str(cls.id),
                "label": f"Parents of {cls.name}",
                "count": student_count,
            })

    return success_response(groups)


@router.post("/broadcast")
@limiter.limit("5/minute")
def broadcast_message(
    request: Request,
    data: BroadcastCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
):
    if not data.subject.strip() or not data.body.strip():
        raise HTTPException(status_code=400, detail="Subject and body are required")

    recipients = _get_broadcast_recipients(db, data.target_type, data.target_value, current_user.id)
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients found for this group")

    for user in recipients:
        msg = Message(
            sender_user_id=current_user.id,
            recipient_user_id=user.id,
            subject=data.subject,
            body=data.body,
        )
        db.add(msg)
        db.flush()
        send_notification(db, user.id, f"Message: {data.subject}", data.body[:100])

    db.commit()
    return success_response({"sent_to": len(recipients)}, f"Message sent to {len(recipients)} recipients")
