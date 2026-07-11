import sys
import os
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.auth import hash_password

def seed_admins():
    db: Session = SessionLocal()
    try:
        # 1. Seed or Update Super Admin
        super_email = "superadmin@school.com"
        super_user = db.query(User).filter(User.email == super_email).first()
        if not super_user:
            super_user = User(
                email=super_email,
                hashed_password=hash_password("12345678"),
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(super_user)
            print(f"[OK] Created Super Admin: {super_email}")
        else:
            super_user.hashed_password = hash_password("12345678")
            super_user.role = UserRole.SUPER_ADMIN
            print(f"[OK] Updated Super Admin password: {super_email}")

        # 2. Seed or Update Supreme Admin
        supreme_email = "supremeadmin@school.com"
        supreme_user = db.query(User).filter(User.email == supreme_email).first()
        if not supreme_user:
            supreme_user = User(
                email=supreme_email,
                hashed_password=hash_password("12345678"),
                role=UserRole.SUPREME_ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(supreme_user)
            print(f"[OK] Created Supreme Admin: {supreme_email}")
        else:
            supreme_user.hashed_password = hash_password("12345678")
            supreme_user.role = UserRole.SUPREME_ADMIN
            print(f"[OK] Updated Supreme Admin password: {supreme_email}")

        db.commit()
        print("[SUCCESS] Seeding complete! Passwords set to '12345678'")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admins()
