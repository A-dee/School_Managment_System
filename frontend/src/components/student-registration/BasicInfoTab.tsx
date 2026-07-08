import React from "react";
import { SectionTitle, DateField } from "./helpers";

interface ParentOption {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface BasicInfoTabProps {
  basic: {
    admission_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    current_class_id: string;
    enrollment_date: string;
    guardian_name: string;
    guardian_phone: string;
    guardian_email: string;
    parent_link_mode: string;
    existing_parent_id: string;
    create_student_login: boolean;
  };
  reg: {
    child_genotype: string;
    child_notes: string;
  };
  setB: (k: string, v: any) => void;
  setR: (k: string, v: any) => void;
  isEdit: boolean;
  teacherMode: boolean;
  classes: any[];
  sessions: any[];
  parents: ParentOption[];
  parentManagedPortal: boolean;
  studentPortalExists: boolean;
  portalActionLoading: string;
  createStudentPortalLater: () => Promise<void>;
  createParentPortalLater: () => Promise<void>;
}

export default function BasicInfoTab({
  basic,
  reg,
  setB,
  setR,
  isEdit,
  teacherMode,
  classes,
  sessions,
  parents,
  parentManagedPortal,
  studentPortalExists,
  portalActionLoading,
  createStudentPortalLater,
  createParentPortalLater,
}: BasicInfoTabProps) {
  const selectedExistingParent = parents.find((parent) => String(parent.id) === basic.existing_parent_id);

  return (
    <div>
      <SectionTitle>Child's Information</SectionTitle>
      <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Start with the student&apos;s core details, then choose whether to keep guardian details only or connect a parent portal. You can still create student and parent access later from this same record.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="t-label">Admission Number *</label>
          <input className="t-input" placeholder="e.g. HHA/2024/001" value={basic.admission_number}
            disabled={isEdit} onChange={e => setB("admission_number", e.target.value)} />
        </div>
        <div>
          <label className="t-label">First Name *</label>
          <input className="t-input" placeholder="First name" value={basic.first_name}
            onChange={e => setB("first_name", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Surname *</label>
          <input className="t-input" placeholder="Last / Surname" value={basic.last_name}
            onChange={e => setB("last_name", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Child's Genotype</label>
          <input className="t-input" placeholder="e.g. AA, AS, SS" value={reg.child_genotype}
            onChange={e => setR("child_genotype", e.target.value)} />
        </div>
        <div>
          <label className="t-label">Sex</label>
          <select className="t-input" value={basic.gender} onChange={e => setB("gender", e.target.value)}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <DateField
          label="Date of Birth"
          value={basic.date_of_birth}
          onChange={(value) => setB("date_of_birth", value)}
          inputId="student-date-of-birth"
        />
        <div>
          <label className="t-label">Class</label>
          <select className="t-input" value={basic.current_class_id}
            onChange={e => setB("current_class_id", e.target.value)}>
            <option value="">— Not assigned —</option>
            {sessions.length > 0
              ? sessions.map((sess: any) => {
                  const sessClasses = classes
                    .filter((c: any) => c.session_id === sess.id)
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));
                  if (sessClasses.length === 0) return null;
                  return (
                    <optgroup key={sess.id} label={sess.name}>
                      {sessClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} — {c.level}</option>
                      ))}
                    </optgroup>
                  );
                })
              : classes
                  .slice()
                  .sort((a: any, b: any) => a.name.localeCompare(b.name))
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.level}</option>
                  ))
            }
          </select>
        </div>
        <DateField
          label="Enrolment Date"
          value={basic.enrollment_date}
          onChange={(value) => setB("enrollment_date", value)}
          inputId="student-enrollment-date"
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="t-label">Tell us things you know about your child</label>
        <textarea className="t-input" rows={3} placeholder="Any special information..."
          value={reg.child_notes} onChange={e => setR("child_notes", e.target.value)}
          style={{ resize: "vertical" }} />
      </div>

      {!teacherMode && (
        <>
          <SectionTitle>Guardian & Portal Setup</SectionTitle>
          <div style={{ padding: "12px 14px", borderRadius: 9, background: "var(--accent-light)", border: "1px solid var(--border)", marginBottom: 12 }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {parentManagedPortal
                ? "This class uses parent-only access. Link an existing parent or create a parent portal account for the guardian."
                : "Choose whether to keep this student under guardian details only, link an existing parent, or create a fresh parent portal now. Student portal access can also be created now or later."}
            </p>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {[
              {
                value: "GUARDIAN_ONLY",
                label: "Guardian Only",
                note: "Save guardian details without creating or linking a parent portal yet.",
                disabled: parentManagedPortal,
              },
              {
                value: "EXISTING_PARENT",
                label: "Use Existing Parent",
                note: "Link this student to a parent account that already exists in the school portal.",
                disabled: false,
              },
              {
                value: "NEW_PARENT_PORTAL",
                label: "Create New Parent Portal",
                note: "Create a new parent login now and link it to this student.",
                disabled: false,
              },
            ].map((option) => {
              const active = basic.parent_link_mode === option.value;
              return (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "11px 12px",
                    borderRadius: 10,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-light)" : "transparent",
                    opacity: option.disabled ? 0.55 : 1,
                    cursor: option.disabled ? "not-allowed" : "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="parent_link_mode"
                    checked={active}
                    disabled={option.disabled}
                    onChange={() => setB("parent_link_mode", option.value)}
                  />
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{option.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{option.note}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="t-label">Guardian / Parent Name</label>
              <input className="t-input" placeholder="Full name" value={basic.guardian_name}
                onChange={e => setB("guardian_name", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Guardian Phone</label>
              <input className="t-input" placeholder="+234..." value={basic.guardian_phone}
                onChange={e => setB("guardian_phone", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Guardian / Parent Email{basic.parent_link_mode === "NEW_PARENT_PORTAL" || parentManagedPortal ? " *" : ""}</label>
              <input className="t-input" type="email" placeholder="parent@email.com"
                value={basic.guardian_email} onChange={e => setB("guardian_email", e.target.value)} />
            </div>
          </div>

          {basic.parent_link_mode === "EXISTING_PARENT" && (
            <div style={{ marginTop: 12 }}>
              <label className="t-label">Select Existing Parent</label>
              <select
                className="t-input"
                value={basic.existing_parent_id}
                onChange={e => setB("existing_parent_id", e.target.value)}
              >
                <option value="">Select parent account</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.full_name}{parent.email ? ` - ${parent.email}` : ""}
                  </option>
                ))}
              </select>
              {selectedExistingParent && (
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 6 }}>
                  This will link {selectedExistingParent.full_name} to this student. Parents can have multiple children linked.
                </p>
              )}
            </div>
          )}

          {!isEdit && !parentManagedPortal && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
              <input
                type="checkbox"
                checked={basic.create_student_login}
                onChange={e => setB("create_student_login", e.target.checked)}
              />
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>Create student portal now</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Turn this off if the student should not have a portal yet. Admin can create it later.
                </div>
              </div>
            </label>
          )}

          {isEdit && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              {!studentPortalExists && !parentManagedPortal && (
                <button
                  type="button"
                  className="t-btn-secondary"
                  disabled={portalActionLoading === "student"}
                  onClick={createStudentPortalLater}
                  style={{ fontSize: "0.8rem" }}
                >
                  {portalActionLoading === "student" ? "Creating Student Portal..." : "Create Student Portal"}
                </button>
              )}
              <button
                type="button"
                className="t-btn-secondary"
                disabled={portalActionLoading === "parent"}
                onClick={createParentPortalLater}
                style={{ fontSize: "0.8rem" }}
              >
                {portalActionLoading === "parent"
                  ? (basic.parent_link_mode === "EXISTING_PARENT" ? "Linking Parent..." : "Creating Parent Portal...")
                  : (basic.parent_link_mode === "EXISTING_PARENT" ? "Link Existing Parent" : "Create Parent Portal")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
