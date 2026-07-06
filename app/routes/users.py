from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import UserRole
from app.schemas.user import UserCreate, UserOut, UserUpdate, AdminPasswordReset
from app.crud.user import (
    create_user, get_user_by_id, get_all_users,
    update_user, activate_user, deactivate_user, get_user_by_email, reset_password
)
from app.utils.auth import get_current_user, verify_password
from app.utils.rbac import is_principal_or_above, is_super_admin
from app.utils.response import success_response, paginated_response
from app.utils.audit import log_action
from app.utils.email import send_login_credentials

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=dict)
def create_new_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
):
    if data.role == UserRole.PRINCIPAL and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can create PRINCIPAL accounts")
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    plain_password = data.password
    user = create_user(db, data)
    log_action(db, "CREATE_USER", "User", current_user.id, entity_id=user.id, new_value={"email": user.email, "role": user.role.value})
    db.commit()
    send_login_credentials(db, user.email, user.email.split("@")[0], plain_password, user.role.value)
    return success_response(UserOut.model_validate(user).model_dump(), "User created")


def _get_full_name(db: Session, user) -> str | None:
    """Resolve the display name from the linked profile for any user role."""
    try:
        if user.role in (UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.NON_TEACHING_STAFF):
            from app.models.staff import Staff
            s = db.query(Staff).filter(Staff.user_id == user.id).first()
            return s.full_name if s else None
        if user.role == UserRole.PARENT:
            from app.models.parent import Parent
            p = db.query(Parent).filter(Parent.user_id == user.id).first()
            return p.full_name if p else None
        if user.role == UserRole.STUDENT:
            from app.models.student import Student
            s = db.query(Student).filter(Student.user_id == user.id).first()
            return f"{s.first_name} {s.last_name}" if s else None
    except Exception:
        pass
    return None


@router.get("/")
def list_users(
    skip: int = 0, limit: int = 50, role: Optional[UserRole] = None,
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    users, total = get_all_users(db, skip=skip, limit=limit, role=role)
    result = []
    for u in users:
        d = UserOut.model_validate(u).model_dump()
        d["full_name"] = _get_full_name(db, u)
        result.append(d)
    return paginated_response(result, total, skip // limit + 1, limit)


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return success_response(UserOut.model_validate(user).model_dump())


@router.put("/{user_id}")
def update_user_info(
    user_id: int, data: UserUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated = update_user(db, user, data)
    db.commit()
    return success_response(UserOut.model_validate(updated).model_dump(), "User updated")


@router.post("/{user_id}/reset-password")
def admin_reset_password(
    user_id: int, data: AdminPasswordReset,
    db: Session = Depends(get_db), current_user=Depends(is_super_admin)
):
    if not verify_password(data.admin_password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Incorrect admin password")
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Use profile settings to change your own password")
    reset_password(db, user, data.new_password)
    log_action(db, "RESET_PASSWORD", "User", current_user.id, entity_id=user_id)
    db.commit()
    return success_response(None, "Password reset successfully")


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(is_super_admin)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    log_action(db, "DELETE_USER", "User", current_user.id, entity_id=user_id, old_value={"email": user.email})
    db.delete(user)
    db.commit()
    return success_response(None, "User deleted")


@router.post("/{user_id}/activate")
def activate(user_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    activate_user(db, user)
    log_action(db, "ACTIVATE_USER", "User", current_user.id, entity_id=user_id)
    db.commit()
    return success_response(None, "User activated")


@router.post("/{user_id}/deactivate")
def deactivate(user_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    deactivate_user(db, user)
    log_action(db, "DEACTIVATE_USER", "User", current_user.id, entity_id=user_id)
    db.commit()
    return success_response(None, "User deactivated")
