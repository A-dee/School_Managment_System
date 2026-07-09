import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parents[1]
script_dir_str = str(SCRIPT_DIR)
while script_dir_str in sys.path:
    sys.path.remove(script_dir_str)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import SessionLocal
from app.models.class_ import Class
from app.models.staff import Staff, StaffGender, StaffStatus, StaffType
from app.models.student import Gender, Student, StudentStatus
from app.models.user import User, UserRole
from app.utils.auth import hash_password

CLASS_NAMES = ["sparkle", "bright", "glimer", "amber", "inferno"]
NUMBER_WORDS = [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
    "Twenty",
]
PASSWORD = "12345678"


def get_or_create_user(db, email: str, role: UserRole) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = role
        user.is_active = True
        return user

    user = User(
        email=email,
        hashed_password=hash_password(PASSWORD),
        role=role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


def seed() -> None:
    db = SessionLocal()
    try:
        classes = db.query(Class).all()
        class_by_name = {class_.name.strip().lower(): class_ for class_ in classes}
        missing = [name for name in CLASS_NAMES if name not in class_by_name]
        if missing:
            raise RuntimeError(f"Missing expected classes: {', '.join(missing)}")

        ordered_classes = [class_by_name[name] for name in CLASS_NAMES]

        teacher_count = 0
        for index, class_ in enumerate(ordered_classes, start=1):
            word = NUMBER_WORDS[index - 1]
            email = f"teacher{index}@school.com"
            user = get_or_create_user(db, email, UserRole.TEACHER)

            staff = db.query(Staff).filter(Staff.user_id == user.id).first()
            if not staff:
                staff = Staff(user_id=user.id, email=email, staff_type=StaffType.TEACHER)
                db.add(staff)

            staff.first_name = "Teacher"
            staff.last_name = word
            staff.full_name = f"Teacher {word}"
            staff.gender = StaffGender.MALE if index % 2 else StaffGender.FEMALE
            staff.email = email
            staff.staff_type = StaffType.TEACHER
            staff.status = StaffStatus.ACTIVE
            staff.bank_name = "Access Bank"
            staff.account_number = f"000123456{index}"
            staff.bank_code = "044"
            staff.account_name = staff.full_name.upper()
            db.flush()

            class_.class_teacher_id = staff.id
            teacher_count += 1

        student_count = 0
        for index in range(1, 21):
            word = NUMBER_WORDS[index - 1]
            email = f"student{index}@school.com"
            user = get_or_create_user(db, email, UserRole.STUDENT)
            class_ = ordered_classes[(index - 1) // 4]
            admission_number = f"ADM-{index:03d}"

            student = db.query(Student).filter(Student.admission_number == admission_number).first()
            if not student:
                student = Student(admission_number=admission_number)
                db.add(student)

            student.user_id = user.id
            student.first_name = "Student"
            student.last_name = word
            student.gender = Gender.MALE if index % 2 else Gender.FEMALE
            student.current_class_id = class_.id
            student.status = StudentStatus.ACTIVE
            student_count += 1

        db.commit()
        print(f"Seeded {teacher_count} teachers/staff and {student_count} students across {len(ordered_classes)} classes.")
        print("Teacher emails: teacher1@school.com - teacher5@school.com")
        print("Student emails: student1@school.com - student20@school.com")
        print(f"Password for all seeded users: {PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
