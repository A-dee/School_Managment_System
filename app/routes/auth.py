from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest
from app.schemas.user import ForgotPassword, PasswordReset, PasswordChange
from app.models.user import User, UserRole
from app.utils.auth import (
    verify_password, create_access_token, create_refresh_token,
    decode_refresh_token, get_current_user, hash_password
)
from app.utils.response import success_response
from app.utils.limiter import limiter
from app.crud.user import get_user_by_email, set_reset_token, reset_password
from app.utils.student_portal import student_requires_parent_portal_by_user_id

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SuperAdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.role.value == "STUDENT" and student_requires_parent_portal_by_user_id(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student portal is disabled for this class. Please sign in with the parent account.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, role=user.role)


@router.post("/refresh")
@limiter.limit("30/minute")
def refresh_token(request: Request, data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(data.refresh_token)
    user_id = payload.get("sub")
    from app.crud.user import get_user_by_id
    user = get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or deactivated")
    if user.role.value == "STUDENT" and student_requires_parent_portal_by_user_id(db, user.id):
        raise HTTPException(status_code=403, detail="Student portal is disabled for this class")
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return success_response({"access_token": access_token, "token_type": "bearer", "role": user.role.value})


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPassword, db: Session = Depends(get_db)):
    from app.utils.email import send_password_reset_email
    user = get_user_by_email(db, data.email)
    if user:
        token = set_reset_token(db, user)
        db.commit()
        send_password_reset_email(to_email=user.email, reset_token=token, user_name=user.email, db=db)
    return success_response(None, "If the email exists, a reset link has been sent")


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_user_password(request: Request, data: PasswordReset, db: Session = Depends(get_db)):
    from app.models.user import User
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user or not user.password_reset_expires or user.password_reset_expires < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    reset_password(db, user, data.new_password)
    db.commit()
    return success_response(None, "Password reset successfully")


@router.post("/change-password")
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    reset_password(db, current_user, data.new_password)
    db.commit()
    return success_response(None, "Password changed successfully")


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return success_response({
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
    })


@router.post("/reset-superadmin-password")
def reset_superadmin_password(
    data: SuperAdminPasswordReset,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != UserRole.SUPREME_ADMIN:
        raise HTTPException(status_code=403, detail="Only the supreme admin can perform this action")
    superadmin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    if not superadmin:
        raise HTTPException(status_code=404, detail="Super admin account not found")
    superadmin.hashed_password = hash_password(data.new_password)
    db.commit()
    return success_response(None, "Super admin password reset successfully")
