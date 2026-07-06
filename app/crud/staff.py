from typing import Optional
from sqlalchemy.orm import Session
from app.models.staff import Staff, StaffType, StaffStatus
from app.models.user import User, UserRole
from app.schemas.staff import StaffCreate, StaffUpdate
from app.utils.auth import hash_password


def create_staff(db: Session, data: StaffCreate) -> Staff:
    role_map = {
        StaffType.TEACHER: UserRole.TEACHER,
        StaffType.ADMIN: UserRole.ADMIN,
        StaffType.NON_TEACHING: UserRole.NON_TEACHING_STAFF,
        StaffType.PRINCIPAL: UserRole.PRINCIPAL,
    }
    user = User(
        email=data.user_email,
        hashed_password=hash_password(data.user_password),
        role=role_map[data.staff_type],
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    staff = Staff(
        user_id=user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        full_name=data.full_name,
        gender=data.gender,
        phone_number=data.phone_number,
        email=data.email,
        address=data.address,
        employment_date=data.employment_date,
        salary_amount=data.salary_amount,
        staff_type=data.staff_type,
        status=StaffStatus.ACTIVE,
    )
    db.add(staff)
    db.flush()
    return staff


def get_staff_by_id(db: Session, staff_id: int) -> Optional[Staff]:
    return db.query(Staff).filter(Staff.id == staff_id).first()


def get_staff_by_user_id(db: Session, user_id: int) -> Optional[Staff]:
    return db.query(Staff).filter(Staff.user_id == user_id).first()


def get_all_staff(db: Session, skip: int = 0, limit: int = 50, staff_type: Optional[StaffType] = None):
    q = db.query(Staff)
    if staff_type:
        q = q.filter(Staff.staff_type == staff_type)
    total = q.count()
    return q.offset(skip).limit(limit).all(), total


def update_staff(db: Session, staff: Staff, data: StaffUpdate) -> Staff:
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(staff, field, value)
    if "full_name" in payload and payload["full_name"]:
        name_parts = payload["full_name"].strip().split(None, 1)
        staff.first_name = name_parts[0]
        staff.last_name = name_parts[1] if len(name_parts) > 1 else ""
    elif "first_name" in payload or "last_name" in payload:
        first_name = payload.get("first_name", staff.first_name or "").strip()
        last_name = payload.get("last_name", staff.last_name or "").strip()
        staff.full_name = " ".join(part for part in [first_name, last_name] if part).strip()
    db.flush()
    return staff


def delete_staff(db: Session, staff: Staff):
    db.delete(staff)
    db.flush()
