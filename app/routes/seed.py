from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.auth import hash_password
from app.utils.response import success_response

router = APIRouter(prefix="/seed", tags=["Seed"])


class SeedAdmin(BaseModel):
    email: str
    password: str
    secret: str


@router.post("/superadmin")
def seed_superadmin(data: SeedAdmin, db: Session = Depends(get_db)):
    if data.secret != "schoolms-init-2024":
        raise HTTPException(status_code=403, detail="Invalid secret")

    existing = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    if existing:
        raise HTTPException(status_code=400, detail="Superadmin already exists")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return success_response({"id": user.id, "email": user.email, "role": user.role}, "Superadmin created successfully")


@router.post("/supremeadmin")
def seed_supremeadmin(data: SeedAdmin, db: Session = Depends(get_db)):
    if data.secret != "schoolms-init-2024":
        raise HTTPException(status_code=403, detail="Invalid secret")
    existing = db.query(User).filter(User.role == UserRole.SUPREME_ADMIN).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supreme admin already exists")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.SUPREME_ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    return success_response(None, "Supreme admin created successfully")
