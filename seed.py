"""
Run once after migrations to create the initial SUPER_ADMIN account.
Usage: python seed.py
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.auth import hash_password

db = SessionLocal()

existing = db.query(User).filter(User.email == "superadmin@school.com").first()
if not existing:
    admin = User(
        email="superadmin@school.com",
        hashed_password=hash_password("Admin@1234"),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    print("SUPER_ADMIN created: superadmin@school.com / Admin@1234")
else:
    print("SUPER_ADMIN already exists")

db.close()
