from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest
from app.schemas.user import ForgotPassword, PasswordReset, PasswordChange
from app.utils.auth import (
    verify_password, create_access_token, create_refresh_token,
    decode_refresh_token, get_current_user
)
from app.utils.response import success_response
from app.crud.user import get_user_by_email, set_reset_token, reset_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, role=user.role)


@router.post("/refresh")
def refresh_token(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(data.refresh_token)
    user_id = payload.get("sub")
    from app.crud.user import get_user_by_id
    user = get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or deactivated")
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return success_response({"access_token": access_token, "token_type": "bearer"})


@router.post("/forgot-password")
def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if user:
        token = set_reset_token(db, user)
        db.commit()
        # In production, send email here. Return token in dev mode.
        return success_response({"reset_token": token}, "Password reset token generated")
    return success_response(None, "If the email exists, a reset link has been sent")


@router.post("/reset-password")
def reset_user_password(data: PasswordReset, db: Session = Depends(get_db)):
    from app.models.user import User
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user or not user.password_reset_expires or user.password_reset_expires < datetime.utcnow():
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
