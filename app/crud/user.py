from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.utils.auth import hash_password, generate_reset_token


def create_user(db: Session, data: UserCreate) -> User:
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.flush()
    return user


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_all_users(db: Session, skip: int = 0, limit: int = 50, role: Optional[UserRole] = None):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return q.offset(skip).limit(limit).all(), q.count()


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.flush()
    return user


def deactivate_user(db: Session, user: User) -> User:
    user.is_active = False
    db.flush()
    return user


def activate_user(db: Session, user: User) -> User:
    user.is_active = True
    db.flush()
    return user


def set_reset_token(db: Session, user: User) -> str:
    token = generate_reset_token()
    user.password_reset_token = token
    user.password_reset_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
    db.flush()
    return token


def reset_password(db: Session, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.flush()
    return user
