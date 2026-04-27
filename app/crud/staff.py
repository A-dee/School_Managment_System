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
        full_name=data.full_name,
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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)
    db.flush()
    return staff


def delete_staff(db: Session, staff: Staff):
    db.delete(staff)
    db.flush()
