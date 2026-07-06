"""
Creates the 2nd term for 2025/2026 and inserts the Second Term fee schedule.
"""
import psycopg2, json
from datetime import datetime

DB = "postgresql://postgres:levi123@localhost:5432/school_db"
SESSION_ID = 2  # 2025/2026 session

# Class ID map (from DB)
CLASS_IDS = {
    "Reception":   14,
    "Preschool":   15,
    "Nursery One": 16,
    "Nursery Two": 17,
    "Grade One":   18,
    "Grade Two":   19,
    "Grade Three": 20,
    "Grade Four":  21,
    "Grade Five":  22,
}

# Grade1/2 share the same fee; Grade3/4 share the same fee
FEE_DATA = {
    "Reception":   {"Tuition": 75000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Preschool":   {"Tuition": 75000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Nursery One": {"Tuition": 85000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Nursery Two": {"Tuition": 90000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Grade One":   {"Tuition": 100000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Grade Two":   {"Tuition": 100000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Grade Three": {"Tuition": 105000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Grade Four":  {"Tuition": 105000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
    "Grade Five":  {"Tuition": 110000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000},
}

now = datetime.now()

conn = psycopg2.connect(DB)
cur  = conn.cursor()

# --- 1. Create 2nd term if it doesn't exist ---
cur.execute("SELECT id FROM terms WHERE name ILIKE '%%2nd%%' AND session_id=%s", (SESSION_ID,))
row = cur.fetchone()
if row:
    term_id = row[0]
    print(f"2nd term already exists (id={term_id})")
else:
    cur.execute(
        "INSERT INTO terms (name, session_id, start_date, end_date, is_current, created_at) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        ("2nd Term", SESSION_ID, "2026-01-06", "2026-04-04", False, now)
    )
    term_id = cur.fetchone()[0]
    print(f"Created 2nd term (id={term_id})")

# --- 2. Insert fee structures ---
created = 0
for class_name, breakdown in FEE_DATA.items():
    class_id = CLASS_IDS[class_name]
    total    = sum(breakdown.values())

    cur.execute(
        "SELECT id FROM fee_structures WHERE class_id=%s AND session_id=%s AND term_id=%s",
        (class_id, SESSION_ID, term_id)
    )
    if cur.fetchone():
        print(f"  SKIP (already exists): {class_name}")
        continue

    cur.execute(
        "INSERT INTO fee_structures (class_id, session_id, term_id, fee_breakdown, total_fee, created_at, updated_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (class_id, SESSION_ID, term_id, json.dumps(breakdown), total, now, now)
    )
    print(f"  Inserted 2nd Term: {class_name} -> NGN {total:,}")
    created += 1

conn.commit()
conn.close()
print(f"\nDone. {created} fee structure(s) inserted for 2nd Term.")
