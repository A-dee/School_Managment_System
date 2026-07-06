"""
Inserts the New Intake fee schedule for 2025/2026 session, 1st term.
Creates classes if they don't already exist.
"""
import psycopg2, json
from datetime import datetime

DB = "postgresql://postgres:levi123@localhost:5432/school_db"
SESSION_ID = 2   # 2025/2026 session
TERM_ID    = 4   # 1st term

CLASSES = [
    ("Creche",      "Creche"),
    ("Reception",   "Reception"),
    ("Preschool",   "Preschool"),
    ("Nursery One", "Nursery"),
    ("Nursery Two", "Nursery"),
    ("Grade One",   "Primary"),
    ("Grade Two",   "Primary"),
    ("Grade Three", "Primary"),
    ("Grade Four",  "Primary"),
    ("Grade Five",  "Primary"),
]

# Fee breakdown per class (New Intake schedule)
FEE_DATA = {
    "Creche": {
        "Tuition": 20000,
    },
    "Reception": {
        "Form": 5000, "Tuition": 46000, "Books": 29000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Preschool": {
        "Form": 5000, "Tuition": 46000, "Books": 29000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Nursery One": {
        "Form": 5000, "Tuition": 57000, "Books": 31000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Nursery Two": {
        "Form": 5000, "Tuition": 61000, "Books": 34000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Grade One": {
        "Form": 5000, "Tuition": 70000, "Books": 41000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Grade Two": {
        "Form": 5000, "Tuition": 70000, "Books": 41000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Grade Three": {
        "Form": 5000, "Tuition": 73000, "Books": 43000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Grade Four": {
        "Form": 5000, "Tuition": 73000, "Books": 43000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
    "Grade Five": {
        "Form": 5000, "Tuition": 78000, "Books": 45000, "Uniform": 12000,
        "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000,
        "Maintenance": 5000, "End of Year Party Fee": 5000,
        "Extra Curricular Activities": 10000,
    },
}

now = datetime.utcnow()

conn = psycopg2.connect(DB)
cur  = conn.cursor()

# --- 1. Ensure classes exist ---
cur.execute("SELECT id, name FROM classes")
existing = {row[1].strip().lower(): row[0] for row in cur.fetchall()}

class_id_map = {}
for name, level in CLASSES:
    key = name.lower()
    if key in existing:
        class_id_map[name] = existing[key]
        print(f"  Class already exists: {name} (id={existing[key]})")
    else:
        cur.execute(
            "INSERT INTO classes (name, level, capacity, session_id, created_at, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (name, level, 40, SESSION_ID, now, now)
        )
        new_id = cur.fetchone()[0]
        class_id_map[name] = new_id
        print(f"  Created class: {name} (id={new_id})")

# --- 2. Insert fee structures ---
created = 0
skipped = 0
for class_name, breakdown in FEE_DATA.items():
    class_id = class_id_map[class_name]
    total = sum(breakdown.values())

    # Check if a fee structure already exists for this class/session/term
    cur.execute(
        "SELECT id FROM fee_structures WHERE class_id=%s AND session_id=%s AND term_id=%s",
        (class_id, SESSION_ID, TERM_ID)
    )
    if cur.fetchone():
        print(f"  SKIP (already exists): {class_name}")
        skipped += 1
        continue

    cur.execute(
        "INSERT INTO fee_structures (class_id, session_id, term_id, fee_breakdown, total_fee, created_at, updated_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (class_id, SESSION_ID, TERM_ID, json.dumps(breakdown), total, now, now)
    )
    print(f"  Inserted fee structure: {class_name} -> NGN {total:,}")
    created += 1

conn.commit()
conn.close()

print(f"\nDone. {created} fee structure(s) created, {skipped} skipped.")
