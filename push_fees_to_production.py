"""
Pushes all fee schedule data to the PRODUCTION backend API.
Usage:
    python push_fees_to_production.py <API_URL> <ADMIN_EMAIL> <ADMIN_PASSWORD>
Example:
    python push_fees_to_production.py https://sms-api.up.railway.app admin@school.com password123
"""
import sys, json, urllib.request, urllib.error

if len(sys.argv) < 4:
    print("Usage: python push_fees_to_production.py <API_URL> <EMAIL> <PASSWORD>")
    sys.exit(1)

BASE   = sys.argv[1].rstrip("/")
EMAIL  = sys.argv[2]
PASSWD = sys.argv[3]

def api(method, path, body=None, token=None):
    url = f"{BASE}/api/v1{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path}: {err[:200]}")
        return None

# ── 1. Login ──────────────────────────────────────────────────────────────────
print("Logging in…")
resp = api("POST", "/auth/login", {"email": EMAIL, "password": PASSWD})
if not resp:
    print("Login failed. Check URL and credentials."); sys.exit(1)
token = resp.get("data", {}).get("access_token")
if not token:
    print("No token in response:", resp); sys.exit(1)
print("  Logged in OK")

# ── 2. Fetch sessions, terms, classes ────────────────────────────────────────
sessions = api("GET", "/academic/sessions", token=token)["data"]
print(f"  Sessions: {[(s['id'], s['name']) for s in sessions]}")

all_terms = []
for sess in sessions:
    t = api("GET", f"/academic/terms?session_id={sess['id']}", token=token)
    all_terms.extend(t["data"] if t else [])
print(f"  Terms: {[(t['id'], t['name']) for t in all_terms]}")

classes_resp = api("GET", "/classes/?limit=200", token=token)
existing_classes = classes_resp["data"] if classes_resp else []
class_map = {c["name"].strip().lower(): c["id"] for c in existing_classes}
print(f"  Classes: {[(c['id'], c['name']) for c in existing_classes]}")

# ── 3. Ensure the right classes exist ────────────────────────────────────────
NEEDED_CLASSES = [
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

session_id = sessions[0]["id"]   # use first (latest) session

class_id_map = {}
for name, level in NEEDED_CLASSES:
    key = name.lower()
    if key in class_map:
        class_id_map[name] = class_map[key]
        print(f"  Class exists: {name} (id={class_map[key]})")
    else:
        r = api("POST", "/classes/", {"name": name, "level": level, "capacity": 40, "session_id": session_id}, token=token)
        if r and r.get("data"):
            new_id = r["data"]["id"]
            class_id_map[name] = new_id
            print(f"  Created class: {name} (id={new_id})")
        else:
            print(f"  FAILED to create class: {name}")

# ── 4. Ensure 3 terms exist (1st, 2nd, 3rd) ──────────────────────────────────
term_name_map = {}
for t in all_terms:
    nm = t["name"].strip().lower()
    for key in ["1st", "2nd", "3rd"]:
        if key in nm:
            term_name_map[key] = t["id"]

def ensure_term(label, start, end):
    if label in term_name_map:
        print(f"  Term '{label}' exists (id={term_name_map[label]})")
        return term_name_map[label]
    r = api("POST", "/academic/terms", {"name": f"{label} Term", "session_id": session_id, "start_date": start, "end_date": end, "is_current": False}, token=token)
    if r and r.get("data"):
        tid = r["data"]["id"]
        term_name_map[label] = tid
        print(f"  Created term '{label}' (id={tid})")
        return tid
    print(f"  FAILED to create term '{label}'")
    return None

t1 = ensure_term("1st", "2025-09-08", "2025-12-13")
t2 = ensure_term("2nd", "2026-01-06", "2026-04-04")
t3 = ensure_term("3rd", "2026-04-20", "2026-07-18")

if not all([t1, t2, t3]):
    print("Could not resolve all terms. Exiting."); sys.exit(1)

# ── 5. Fee schedules ──────────────────────────────────────────────────────────
ALL_STD = {"Termly Assessment": 5000, "Extra Curricular Activities": 15000}
MAINTENANCE = 10000
END_PARTY   = 10000

# (class_name, term_key, breakdown_dict)
SCHEDULES = [
    # ─ 1st Term: New Intake ─
    ("Creche",      "1st", {"Tuition": 20000}),
    ("Reception",   "1st", {"Form": 5000, "Tuition": 46000, "Books": 29000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Preschool",   "1st", {"Form": 5000, "Tuition": 46000, "Books": 29000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Nursery One", "1st", {"Form": 5000, "Tuition": 57000, "Books": 31000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Nursery Two", "1st", {"Form": 5000, "Tuition": 61000, "Books": 34000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Grade One",   "1st", {"Form": 5000, "Tuition": 70000, "Books": 41000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Grade Two",   "1st", {"Form": 5000, "Tuition": 70000, "Books": 41000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Grade Three", "1st", {"Form": 5000, "Tuition": 73000, "Books": 43000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Grade Four",  "1st", {"Form": 5000, "Tuition": 73000, "Books": 43000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    ("Grade Five",  "1st", {"Form": 5000, "Tuition": 78000, "Books": 45000, "Uniform": 12000, "Termly Assessment": 5000, "Cardigan": 10000, "Sportswear": 8000, "Maintenance": 5000, "End of Year Party Fee": 5000, "Extra Curricular Activities": 10000}),
    # ─ 1st Term: Returning Pupils ─
    ("Reception",   "1st", {"Tuition": 75000, "Books": 33000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Preschool",   "1st", {"Tuition": 75000, "Books": 33000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Nursery One", "1st", {"Tuition": 85000, "Books": 37000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Nursery Two", "1st", {"Tuition": 90000, "Books": 40000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Grade One",   "1st", {"Tuition": 100000, "Books": 50000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Grade Two",   "1st", {"Tuition": 100000, "Books": 50000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Grade Three", "1st", {"Tuition": 105000, "Books": 60000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Grade Four",  "1st", {"Tuition": 105000, "Books": 60000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    ("Grade Five",  "1st", {"Tuition": 110000, "Books": 65000, "Termly Assessment": 5000, "Maintenance": 10000, "End of Year Party Fee": 10000, "Extra Curricular Activities": 15000}),
    # ─ 2nd Term ─
    ("Reception",   "2nd", {"Tuition": 75000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Preschool",   "2nd", {"Tuition": 75000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Nursery One", "2nd", {"Tuition": 85000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Nursery Two", "2nd", {"Tuition": 90000,  "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Grade One",   "2nd", {"Tuition": 100000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Grade Two",   "2nd", {"Tuition": 100000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Grade Three", "2nd", {"Tuition": 105000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Grade Four",  "2nd", {"Tuition": 105000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    ("Grade Five",  "2nd", {"Tuition": 110000, "Termly Assessment": 5000, "Extra Curricular Activities": 15000}),
    # ─ 3rd Term ─
    ("Reception",   "3rd", {"Tuition": 75000,  "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 5000}),
    ("Preschool",   "3rd", {"Tuition": 75000,  "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 15000}),
    ("Nursery One", "3rd", {"Tuition": 85000,  "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 5000}),
    ("Nursery Two", "3rd", {"Tuition": 90000,  "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 15000}),
    ("Grade One",   "3rd", {"Tuition": 100000, "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 5000}),
    ("Grade Two",   "3rd", {"Tuition": 100000, "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 5000}),
    ("Grade Three", "3rd", {"Tuition": 105000, "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 5000}),
    ("Grade Four",  "3rd", {"Tuition": 105000, "Termly Assessment": 5000,  "Extra Curricular Activities": 15000, "Graduation": 5000}),
    ("Grade Five",  "3rd", {"Tuition": 110000, "Termly Assessment": 20000, "Extra Curricular Activities": 15000, "Graduation": 15000}),
]

TERM_ID_BY_KEY = {"1st": t1, "2nd": t2, "3rd": t3}

created = skipped = failed = 0
for class_name, term_key, breakdown in SCHEDULES:
    cid = class_id_map.get(class_name)
    tid = TERM_ID_BY_KEY.get(term_key)
    if not cid or not tid:
        print(f"  SKIP (missing id): {class_name} / {term_key}")
        skipped += 1
        continue
    total = sum(breakdown.values())
    r = api("POST", "/finance/fee-structures", {
        "class_id": cid, "session_id": session_id, "term_id": tid,
        "fee_breakdown": breakdown, "total_fee": total,
    }, token=token)
    if r:
        print(f"  OK: {class_name} / {term_key} Term -> NGN {total:,}")
        created += 1
    else:
        failed += 1

# ── 6. Optional fees ──────────────────────────────────────────────────────────
print("\nAdding optional fees…")
OPT_FEES = [
    ("After School Lesson", "After School", 10000, "monthly", "After school tutoring - per month"),
    ("Arts and Craft",      "Clubs",        10000, "termly",  None),
    ("Music",               "Clubs",        10000, "termly",  None),
    ("Public Speaking and Debate", "Clubs", 10000, "termly",  None),
    ("Dance",               "Clubs",        10000, "termly",  None),
]
for name, cat, amt, billing, desc in OPT_FEES:
    r = api("POST", "/finance/optional-fees", {"name": name, "category": cat, "amount": amt, "billing_period": billing, "description": desc}, token=token)
    if r:
        print(f"  Optional fee added: {name}")
    else:
        print(f"  Optional fee may already exist: {name}")

print(f"\nDone. {created} fee structures created, {skipped} skipped, {failed} failed.")
