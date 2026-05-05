"""
Inserts the Returning Pupils fee schedule for 2025/2026 session, 1st term.
"""
import psycopg2, json
from datetime import datetime

DB = "postgresql://postgres:levi123@localhost:5432/school_db"
SESSION_ID = 2   # 2025/2026 session
TERM_ID    = 4   # 1st term

# Fee breakdown per class - Returning Pupils (no Form/Uniform/Cardigan/Sportswear)
FEE_DATA = {
    "Reception": {
        "Tuition": 75000, "Books": 33000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Preschool": {
        "Tuition": 75000, "Books": 33000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Nursery One": {
        "Tuition": 85000, "Books": 37000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Nursery Two": {
        "Tuition": 90000, "Books": 40000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Grade One": {
        "Tuition": 100000, "Books": 50000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Grade Two": {
        "Tuition": 100000, "Books": 50000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Grade Three": {
        "Tuition": 105000, "Books": 60000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Grade Four": {
        "Tuition": 105000, "Books": 60000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
    "Grade Five": {
        "Tuition": 110000, "Books": 65000, "Termly Assessment": 5000,
        "Maintenance": 10000, "End of Year Party Fee": 10000,
        "Extra Curricular Activities": 15000,
    },
}

now = datetime.now()

conn = psycopg2.connect(DB)
cur  = conn.cursor()

# Get class id map
cur.execute("SELECT id, name FROM classes")
class_id_map = {row[1].strip().lower(): row[0] for row in cur.fetchall()}

created = 0
errors  = 0
for class_name, breakdown in FEE_DATA.items():
    class_id = class_id_map.get(class_name.lower())
    if not class_id:
        print(f"  ERROR: class not found in DB: {class_name}")
        errors += 1
        continue

    total = sum(breakdown.values())
    cur.execute(
        "INSERT INTO fee_structures (class_id, session_id, term_id, fee_breakdown, total_fee, created_at, updated_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (class_id, SESSION_ID, TERM_ID, json.dumps(breakdown), total, now, now)
    )
    print(f"  Inserted (Returning): {class_name} -> NGN {total:,}")
    created += 1

conn.commit()
conn.close()
print(f"\nDone. {created} returning-pupil fee structure(s) created, {errors} error(s).")
