"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { X, User, HeartPulse, Smile, FolderOpen, Upload, Trash2, Eye } from "lucide-react";

interface Props {
  studentId?: number | null;
  classId?: number | null;
  classes: any[];
  sessions?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const blankBasic = {
  admission_number: "", first_name: "", last_name: "",
  gender: "MALE", date_of_birth: "", current_class_id: "",
  enrollment_date: new Date().toISOString().split("T")[0],
  guardian_name: "", guardian_phone: "", guardian_email: "",
};

const blankReg = {
  father_full_name: "", father_occupation: "", father_genotype: "",
  father_state: "", father_local_government: "", father_age: "",
  father_work_address: "", father_house_address: "", father_phone: "",
  mother_full_name: "", mother_occupation: "", mother_genotype: "",
  mother_state: "", mother_local_government: "", mother_age: "",
  mother_work_address: "", mother_house_address: "", mother_phone: "",
  child_genotype: "", child_notes: "",
};

const blankMed = {
  height: "", weight: "", bmi: "",
  immunization_age_appropriate: null as boolean | null,
  immunization_complete: null as boolean | null,
  has_asthma: null as boolean | null, has_allergies: null as boolean | null,
  has_sight_issues: null as boolean | null, has_hearing_issues: null as boolean | null,
  has_epilepsy: null as boolean | null, has_bleeding_disorder: null as boolean | null,
  has_fear_phobia: null as boolean | null, on_medications: null as boolean | null,
  had_major_surgery: null as boolean | null, medical_details: "",
  eye_left: "", eye_right: "", hearing_left: "", hearing_right: "",
  dental: "", chest_exam: "", abdomen_exam: "",
  blood_hbsag: "", blood_hiv: "", blood_group: "", blood_genotype: "",
  urinalysis: "", stool_microscopy: "",
  is_fit_for_activities: null as boolean | null,
  doctor_name: "", hospital_name: "", exam_date: "",
};

const blankAbout = {
  nickname: "", been_in_childcare: null as boolean | null,
  childcare_terminated_reason: "", is_extremely_active: null as boolean | null,
  does_child_talk: null as boolean | null, speaks_other_language: null as boolean | null,
  other_language: "", word_water: "", word_mama: "", word_sleep: "", other_words: "",
  eats_regular_food: null as boolean | null, about_to_introduce_food: null as boolean | null,
  best_food: "", is_picky_eater: null as boolean | null, picky_eater_strategy: "",
  has_known_allergy: null as boolean | null, known_allergies: "", allergy_instructions: "",
  easy_to_fall_asleep: null as boolean | null, easily_startled_sleeping: null as boolean | null,
  sleep_helpers: "", disposition_waking: "",
  diaper_cream: "", what_upsets_child: "", what_makes_child_happy: "",
  has_health_problem: null as boolean | null, health_problem_description: "",
  needs_regular_medication: null as boolean | null, medication_details: "",
  child_scared_of: "", filled_by: "", form_filled_on: "",
};

type YNValue = boolean | null;

function YesNo({ label, value, onChange }: { label: string; value: YNValue; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {label && <span className="t-text-secondary" style={{ fontSize: "0.8125rem", minWidth: 120 }}>{label}</span>}
      <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <input type="radio" checked={value === true} onChange={() => onChange(true)} />
        <span style={{ fontSize: "0.8125rem" }}>Yes</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <input type="radio" checked={value === false} onChange={() => onChange(false)} />
        <span style={{ fontSize: "0.8125rem" }}>No</span>
      </label>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid var(--accent)", display: "inline-block" }}>
      <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</h3>
    </div>
  );
}

export default function StudentRegistrationModal({ studentId, classId, classes, sessions = [], onClose, onSuccess }: Props) {
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const isEdit = !!studentId;

  const [basic, setBasic] = useState({ ...blankBasic, current_class_id: classId ? String(classId) : "" });
  const [reg, setReg] = useState(blankReg);
  const [med, setMed] = useState(blankMed);
  const [about, setAbout] = useState(blankAbout);

  const loadDocuments = async (sid: number) => {
    try {
      const r = await api.get(`/api/v1/students/${sid}/documents`);
      setDocuments(r.data.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!studentId) return;
    loadDocuments(studentId);
    Promise.all([
      api.get(`/api/v1/students/${studentId}`),
      api.get(`/api/v1/students/${studentId}/registration`),
      api.get(`/api/v1/students/${studentId}/medical`),
      api.get(`/api/v1/students/${studentId}/about-me`),
    ]).then(([s, r, m, a]) => {
      const stu = s.data.data;
      if (stu) setBasic({
        admission_number: stu.admission_number || "",
        first_name: stu.first_name || "",
        last_name: stu.last_name || "",
        gender: stu.gender || "MALE",
        date_of_birth: stu.date_of_birth || "",
        current_class_id: stu.current_class_id ? String(stu.current_class_id) : "",
        enrollment_date: stu.enrollment_date || "",
        guardian_name: "",
        guardian_phone: "",
        guardian_email: "",
      });
      if (r.data.data) setReg(prev => ({ ...prev, ...nullToEmpty(r.data.data) }));
      if (m.data.data) setMed(prev => ({ ...prev, ...m.data.data }));
      if (a.data.data) setAbout(prev => ({ ...prev, ...nullToEmpty(a.data.data) }));
    }).catch(() => {});
  }, [studentId]);

  const nullToEmpty = (obj: any) => {
    const out: any = {};
    for (const k in obj) out[k] = obj[k] === null || obj[k] === undefined ? "" : obj[k];
    return out;
  };

  const boolToNull = (obj: any) => {
    const out: any = {};
    for (const k in obj) {
      if (obj[k] === "") out[k] = null;
      else out[k] = obj[k];
    }
    return out;
  };

  const save = async () => {
    if (!basic.admission_number || !basic.first_name || !basic.last_name) {
      toast.error("Admission number, first and last name are required");
      setTab(0);
      return;
    }
    setSaving(true);
    try {
      let sid = studentId;

      if (!sid) {
        const res = await api.post("/api/v1/students/", {
          admission_number: basic.admission_number,
          first_name: basic.first_name,
          last_name: basic.last_name,
          gender: basic.gender,
          date_of_birth: basic.date_of_birth || null,
          current_class_id: basic.current_class_id ? Number(basic.current_class_id) : null,
          enrollment_date: basic.enrollment_date || null,
          guardian_name: basic.guardian_name || null,
          guardian_phone: basic.guardian_phone || null,
          guardian_email: basic.guardian_email || null,
        });
        sid = res.data.data?.id;
        if (!sid) throw new Error("Failed to get student ID");
        const creds = res.data.data?.credentials;
        if (creds) setCredentials(creds);
      } else {
        await api.put(`/api/v1/students/${sid}`, {
          first_name: basic.first_name,
          last_name: basic.last_name,
          date_of_birth: basic.date_of_birth || null,
          current_class_id: basic.current_class_id ? Number(basic.current_class_id) : null,
        });
      }

      const regPayload: any = { ...reg };
      regPayload.father_age = reg.father_age ? Number(reg.father_age) : null;
      regPayload.mother_age = reg.mother_age ? Number(reg.mother_age) : null;
      for (const k in regPayload) if (regPayload[k] === "") regPayload[k] = null;

      const medPayload: any = boolToNull({ ...med });
      if (medPayload.exam_date === "") medPayload.exam_date = null;

      const aboutPayload: any = boolToNull({ ...about });
      if (aboutPayload.form_filled_on === "") aboutPayload.form_filled_on = null;

      await Promise.all([
        api.put(`/api/v1/students/${sid}/registration`, regPayload),
        api.put(`/api/v1/students/${sid}/medical`, medPayload),
        api.put(`/api/v1/students/${sid}/about-me`, aboutPayload),
      ]);

      toast.success(isEdit ? "Student updated successfully" : "Student registered successfully");
      onSuccess();
      if (isEdit) onClose();
      // For new students, stay open to show generated login credentials
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    }
    setSaving(false);
  };

  const setB = (k: string, v: any) => setBasic(p => ({ ...p, [k]: v }));
  const setR = (k: string, v: any) => setReg(p => ({ ...p, [k]: v }));
  const setM = (k: string, v: any) => setMed(p => ({ ...p, [k]: v }));
  const setA = (k: string, v: any) => setAbout(p => ({ ...p, [k]: v }));

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted"); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", "registration_form");
      await api.post(`/api/v1/students/${studentId}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded");
      loadDocuments(studentId);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  const viewDocument = async (docId: number, filename: string) => {
    if (!studentId) return;
    try {
      const res = await api.get(`/api/v1/students/${studentId}/documents/${docId}/file`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch { toast.error("Failed to open document"); }
  };

  const deleteDocument = async (docId: number) => {
    if (!studentId || !confirm("Delete this document? This cannot be undone.")) return;
    setDeletingDoc(docId);
    try {
      await api.delete(`/api/v1/students/${studentId}/documents/${docId}`);
      toast.success("Document deleted");
      setDocuments(p => p.filter(d => d.id !== docId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete");
    }
    setDeletingDoc(null);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const TABS = [
    { label: "Registration Form", icon: User },
    { label: "Medical Information", icon: HeartPulse },
    { label: "About Me", icon: Smile },
    { label: "Documents", icon: FolderOpen },
  ];

  /* ── Credentials overlay shown after successful student creation ── */
  if (credentials) {
    const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };
    const Row = ({ label, value }: { label: string; value?: string }) => value ? (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 8, background: "var(--bg-page)", border: "1px solid var(--border)", marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 2 }}>{label}</p>
          <p style={{ fontFamily: "monospace", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>{value}</p>
        </div>
        <button onClick={() => copy(value)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Copy</button>
      </div>
    ) : null;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "var(--bg-card)", borderRadius: 14, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <span style={{ fontSize: "1.5rem" }}>✓</span>
            </div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: 4 }}>Student Enrolled</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Login credentials have been generated. Save these — passwords cannot be recovered.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)", marginBottom: 10 }}>Student Account</p>
            <Row label="Email / Username" value={credentials.student_email} />
            <Row label="Password" value={credentials.student_password} />
          </div>

          {(credentials.parent_email) && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)", marginBottom: 10 }}>Parent Account</p>
              <Row label="Email / Username" value={credentials.parent_email} />
              <Row label="Password" value={credentials.parent_password} />
              {credentials.parent_note && (
                <p style={{ fontSize: "0.75rem", color: "#d97706", marginTop: 4 }}>{credentials.parent_note}</p>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const txt = `STUDENT LOGIN\nEmail: ${credentials.student_email}\nPassword: ${credentials.student_password}` +
                  (credentials.parent_email ? `\n\nPARENT LOGIN\nEmail: ${credentials.parent_email}\nPassword: ${credentials.parent_password || "(existing account)"}` : "");
                copy(txt);
              }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer" }}
            >
              Copy All Credentials
            </button>
            <button
              onClick={() => { setCredentials(null); onClose(); }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 14, width: "100%", maxWidth: 860,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 0", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 className="t-text-primary font-semibold" style={{ fontSize: "1.0625rem" }}>
                {isEdit ? "Edit Student Record" : "Register New Student"}
              </h2>
              <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 2 }}>Hope Hills Academy · All 3 sections</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
              <X size={20} />
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map((t, i) => {
              const Icon = t.icon;
              return (
                <button key={i} onClick={() => setTab(i)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                  background: "none", border: "none", cursor: "pointer",
                  borderBottom: tab === i ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === i ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: tab === i ? 600 : 400,
                  fontSize: "0.8125rem", marginBottom: -1,
                }}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ===== TAB 0: REGISTRATION FORM ===== */}
          {tab === 0 && (
            <div>
              <SectionTitle>Child's Information</SectionTitle>
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
                <div>
                  <label className="t-label">Date of Birth</label>
                  <input className="t-input" type="date" value={basic.date_of_birth}
                    onChange={e => setB("date_of_birth", e.target.value)} />
                </div>
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
                <div>
                  <label className="t-label">Enrolment Date</label>
                  <input className="t-input" type="date" value={basic.enrollment_date}
                    onChange={e => setB("enrollment_date", e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="t-label">Tell us things you know about your child</label>
                <textarea className="t-input" rows={3} placeholder="Any special information..."
                  value={reg.child_notes} onChange={e => setR("child_notes", e.target.value)}
                  style={{ resize: "vertical" }} />
              </div>

              {!isEdit && (
                <>
                  <SectionTitle>Portal Access</SectionTitle>
                  <div style={{ padding: "12px 14px", borderRadius: 9, background: "var(--accent-light)", border: "1px solid var(--border)", marginBottom: 12 }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      A <b>student login account</b> is automatically created on enrolment. Enter the parent's email below to also create a <b>parent account</b> so they can log in and view their child's results, fees, and attendance.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="t-label">Guardian / Parent Email</label>
                      <input className="t-input" type="email" placeholder="parent@email.com"
                        value={basic.guardian_email} onChange={e => setB("guardian_email", e.target.value)} />
                    </div>
                    <div>
                      <label className="t-label">Guardian Name</label>
                      <input className="t-input" placeholder="Full name" value={basic.guardian_name}
                        onChange={e => setB("guardian_name", e.target.value)} />
                    </div>
                    <div>
                      <label className="t-label">Guardian Phone</label>
                      <input className="t-input" placeholder="+234..." value={basic.guardian_phone}
                        onChange={e => setB("guardian_phone", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <SectionTitle>Father's Information</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="t-label">Father's Full Name</label>
                  <input className="t-input" placeholder="Father's full name" value={reg.father_full_name}
                    onChange={e => setR("father_full_name", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Occupation</label>
                  <input className="t-input" placeholder="Occupation" value={reg.father_occupation}
                    onChange={e => setR("father_occupation", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Genotype</label>
                  <input className="t-input" placeholder="e.g. AA" value={reg.father_genotype}
                    onChange={e => setR("father_genotype", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Age</label>
                  <input className="t-input" type="number" placeholder="Age" value={reg.father_age}
                    onChange={e => setR("father_age", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">State</label>
                  <input className="t-input" placeholder="State of origin" value={reg.father_state}
                    onChange={e => setR("father_state", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Local Government</label>
                  <input className="t-input" placeholder="LGA" value={reg.father_local_government}
                    onChange={e => setR("father_local_government", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Phone Number</label>
                  <input className="t-input" placeholder="+234..." value={reg.father_phone}
                    onChange={e => setR("father_phone", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="t-label">Address of Place of Work</label>
                  <input className="t-input" placeholder="Father's work address" value={reg.father_work_address}
                    onChange={e => setR("father_work_address", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="t-label">House Address</label>
                  <input className="t-input" placeholder="House address and phone number" value={reg.father_house_address}
                    onChange={e => setR("father_house_address", e.target.value)} />
                </div>
              </div>

              <SectionTitle>Mother's Information</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="t-label">Mother's Full Name</label>
                  <input className="t-input" placeholder="Mother's full name" value={reg.mother_full_name}
                    onChange={e => setR("mother_full_name", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Occupation</label>
                  <input className="t-input" placeholder="Occupation" value={reg.mother_occupation}
                    onChange={e => setR("mother_occupation", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Genotype</label>
                  <input className="t-input" placeholder="e.g. AA" value={reg.mother_genotype}
                    onChange={e => setR("mother_genotype", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Age</label>
                  <input className="t-input" type="number" placeholder="Age" value={reg.mother_age}
                    onChange={e => setR("mother_age", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">State</label>
                  <input className="t-input" placeholder="State of origin" value={reg.mother_state}
                    onChange={e => setR("mother_state", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Local Government</label>
                  <input className="t-input" placeholder="LGA" value={reg.mother_local_government}
                    onChange={e => setR("mother_local_government", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Phone Number</label>
                  <input className="t-input" placeholder="+234..." value={reg.mother_phone}
                    onChange={e => setR("mother_phone", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="t-label">Address of Place of Work</label>
                  <input className="t-input" placeholder="Mother's work address" value={reg.mother_work_address}
                    onChange={e => setR("mother_work_address", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="t-label">House Address</label>
                  <input className="t-input" placeholder="House address and phone number" value={reg.mother_house_address}
                    onChange={e => setR("mother_house_address", e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "var(--accent-light)", fontSize: "0.78rem", color: "var(--accent)" }}>
                <strong>NOTE:</strong> Every parent should please come along with their child's immunization certificate.<br />
                Bank Account: Hope Hills Academy &nbsp;·&nbsp; 1015842401 Zenith Bank
              </div>
            </div>
          )}

          {/* ===== TAB 1: MEDICAL INFORMATION ===== */}
          {tab === 1 && (
            <div>
              <SectionTitle>Child Medical Information</SectionTitle>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="t-label">Height</label>
                  <input className="t-input" placeholder="e.g. 90cm" value={med.height}
                    onChange={e => setM("height", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Weight</label>
                  <input className="t-input" placeholder="e.g. 14kg" value={med.weight}
                    onChange={e => setM("weight", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">BMI</label>
                  <input className="t-input" placeholder="Body Mass Index" value={med.bmi}
                    onChange={e => setM("bmi", e.target.value)} />
                </div>
              </div>

              <SectionTitle>Immunization Record</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <YesNo label="The child has had the age appropriate immunization"
                  value={med.immunization_age_appropriate}
                  onChange={v => setM("immunization_age_appropriate", v)} />
                <YesNo label="The child did not complete all necessary immunization"
                  value={med.immunization_complete === null ? null : !med.immunization_complete}
                  onChange={v => setM("immunization_complete", !v)} />
              </div>

              <SectionTitle>Medical History</SectionTitle>
              <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 12 }}>
                Has the child ever suffered from any of the following? Please circle the answer.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px" }}>
                {[
                  ["has_asthma", "Asthma"], ["has_epilepsy", "Epilepsy"],
                  ["has_allergies", "Allergies"], ["has_bleeding_disorder", "Bleeding disorder (e.g. nose bleeding)"],
                  ["has_sight_issues", "Sight issues"], ["has_fear_phobia", "Fear or phobia"],
                  ["has_hearing_issues", "Hearing issues"], ["on_medications", "Is your child currently on any medications?"],
                  ["had_major_surgery", "Any major injury or surgery since birth?"],
                ].map(([field, label]) => (
                  <YesNo key={field} label={label}
                    value={(med as any)[field]}
                    onChange={v => setM(field, v)} />
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="t-label">Details</label>
                <textarea className="t-input" rows={3} placeholder="Provide any details here..."
                  value={med.medical_details} onChange={e => setM("medical_details", e.target.value)}
                  style={{ resize: "vertical" }} />
              </div>

              <SectionTitle>Medical Certificate Section</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="t-label">Eye — Left</label>
                  <input className="t-input" placeholder="Result" value={med.eye_left}
                    onChange={e => setM("eye_left", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Eye — Right</label>
                  <input className="t-input" placeholder="Result" value={med.eye_right}
                    onChange={e => setM("eye_right", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Hearing — Left</label>
                  <input className="t-input" placeholder="Result" value={med.hearing_left}
                    onChange={e => setM("hearing_left", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Hearing — Right</label>
                  <input className="t-input" placeholder="Result" value={med.hearing_right}
                    onChange={e => setM("hearing_right", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="t-label">Dental</label>
                  <input className="t-input" placeholder="Dental result" value={med.dental}
                    onChange={e => setM("dental", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Chest Exam</label>
                  <input className="t-input" placeholder="Result" value={med.chest_exam}
                    onChange={e => setM("chest_exam", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Abdomen Exam</label>
                  <input className="t-input" placeholder="Result" value={med.abdomen_exam}
                    onChange={e => setM("abdomen_exam", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Blood — HBsAg</label>
                  <input className="t-input" placeholder="Reactive / NR" value={med.blood_hbsag}
                    onChange={e => setM("blood_hbsag", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Blood — HIV</label>
                  <input className="t-input" placeholder="+" value={med.blood_hiv}
                    onChange={e => setM("blood_hiv", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Blood Group</label>
                  <input className="t-input" placeholder="A / B / O / AB" value={med.blood_group}
                    onChange={e => setM("blood_group", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Genotype</label>
                  <input className="t-input" placeholder="AA / AS / SS" value={med.blood_genotype}
                    onChange={e => setM("blood_genotype", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="t-label">Urinalysis</label>
                  <input className="t-input" placeholder="Urinalysis result" value={med.urinalysis}
                    onChange={e => setM("urinalysis", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="t-label">Stool Microscopy</label>
                  <input className="t-input" placeholder="Stool microscopy result" value={med.stool_microscopy}
                    onChange={e => setM("stool_microscopy", e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="t-label">Fitness for Activities</label>
                <YesNo label="Physically fit to participate in group care and school activities"
                  value={med.is_fit_for_activities}
                  onChange={v => setM("is_fit_for_activities", v)} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="t-label">Name of Doctor</label>
                  <input className="t-input" placeholder="Doctor's name" value={med.doctor_name}
                    onChange={e => setM("doctor_name", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Name of Hospital</label>
                  <input className="t-input" placeholder="Hospital name" value={med.hospital_name}
                    onChange={e => setM("hospital_name", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Exam Date</label>
                  <input className="t-input" type="date" value={med.exam_date}
                    onChange={e => setM("exam_date", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 2: ABOUT ME ===== */}
          {tab === 2 && (
            <div>
              <SectionTitle>All About Me (13M – 18M)</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="t-label">Child's Nickname</label>
                  <input className="t-input" placeholder="Nickname" value={about.nickname}
                    onChange={e => setA("nickname", e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <YesNo label="1. Has your child been in childcare before?"
                  value={about.been_in_childcare}
                  onChange={v => setA("been_in_childcare", v)} />
                {about.been_in_childcare && (
                  <div>
                    <label className="t-label">If yes, why was care terminated?</label>
                    <input className="t-input" value={about.childcare_terminated_reason}
                      onChange={e => setA("childcare_terminated_reason", e.target.value)} />
                  </div>
                )}
                <YesNo label="2. Is your child extremely active?"
                  value={about.is_extremely_active}
                  onChange={v => setA("is_extremely_active", v)} />
                <YesNo label="3. Does your child talk?"
                  value={about.does_child_talk}
                  onChange={v => setA("does_child_talk", v)} />
                <YesNo label="4. Does your child speak another language (apart from English)?"
                  value={about.speaks_other_language}
                  onChange={v => setA("speaks_other_language", v)} />
                {about.speaks_other_language && (
                  <div>
                    <label className="t-label">Which language?</label>
                    <input className="t-input" value={about.other_language}
                      onChange={e => setA("other_language", e.target.value)} />
                  </div>
                )}

                <div>
                  <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 8 }}>
                    5. If he/she talks, how will he/she say:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="t-label">I am hungry</label>
                      <input className="t-input" placeholder="How they say it" value={about.word_water}
                        onChange={e => setA("word_water", e.target.value)} />
                    </div>
                    <div>
                      <label className="t-label">Mama</label>
                      <input className="t-input" placeholder="How they say it" value={about.word_mama}
                        onChange={e => setA("word_mama", e.target.value)} />
                    </div>
                    <div>
                      <label className="t-label">Sleep</label>
                      <input className="t-input" placeholder="How they say it" value={about.word_sleep}
                        onChange={e => setA("word_sleep", e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="t-label">Other words</label>
                    <input className="t-input" placeholder="Other words they use" value={about.other_words}
                      onChange={e => setA("other_words", e.target.value)} />
                  </div>
                </div>

                <YesNo label="6. Does your child eat regular food?"
                  value={about.eats_regular_food}
                  onChange={v => setA("eats_regular_food", v)} />
                <YesNo label="   About To Introduce?"
                  value={about.about_to_introduce_food}
                  onChange={v => setA("about_to_introduce_food", v)} />

                <div>
                  <label className="t-label">7. What is your child's best food?</label>
                  <input className="t-input" value={about.best_food}
                    onChange={e => setA("best_food", e.target.value)} />
                </div>

                <YesNo label="8. Is your child a picky eater?"
                  value={about.is_picky_eater}
                  onChange={v => setA("is_picky_eater", v)} />
                {about.is_picky_eater && (
                  <div>
                    <label className="t-label">Is there any strategy that works for him/her?</label>
                    <input className="t-input" value={about.picky_eater_strategy}
                      onChange={e => setA("picky_eater_strategy", e.target.value)} />
                  </div>
                )}

                <YesNo label="9. Does your child have any known allergy?"
                  value={about.has_known_allergy}
                  onChange={v => setA("has_known_allergy", v)} />
                {about.has_known_allergy && (
                  <div>
                    <label className="t-label">Please list allergies</label>
                    <input className="t-input" value={about.known_allergies}
                      onChange={e => setA("known_allergies", e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="t-label">10. Special instructions in case of any allergic reaction</label>
                  <textarea className="t-input" rows={2} value={about.allergy_instructions}
                    onChange={e => setA("allergy_instructions", e.target.value)} style={{ resize: "vertical" }} />
                </div>

                <div>
                  <p className="t-text-secondary" style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 8 }}>11. Nap times:</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12 }}>
                    <YesNo label="a) Is it easy for your child to fall asleep?"
                      value={about.easy_to_fall_asleep}
                      onChange={v => setA("easy_to_fall_asleep", v)} />
                    <YesNo label="b) Is your child easily startled while sleeping?"
                      value={about.easily_startled_sleeping}
                      onChange={v => setA("easily_startled_sleeping", v)} />
                    <div>
                      <label className="t-label">c) What helps your child to go to bed?</label>
                      <input className="t-input" value={about.sleep_helpers}
                        onChange={e => setA("sleep_helpers", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="t-label">12. What is your child's disposition upon waking up?</label>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
                    {["happy", "grouchy", "clingy", "slow"].map(opt => (
                      <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: "0.8125rem" }}>
                        <input type="radio" name="disposition" checked={about.disposition_waking === opt}
                          onChange={() => setA("disposition_waking", opt)} />
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="t-label">13. Cream or powder used during diaper change</label>
                  <input className="t-input" placeholder="Specify product and frequency" value={about.diaper_cream}
                    onChange={e => setA("diaper_cream", e.target.value)} />
                </div>

                <div>
                  <label className="t-label">14. What can make your child upset?</label>
                  <input className="t-input" value={about.what_upsets_child}
                    onChange={e => setA("what_upsets_child", e.target.value)} />
                </div>

                <div>
                  <label className="t-label">15. If your child is upset, what can we do to make him/her happy?</label>
                  <input className="t-input" value={about.what_makes_child_happy}
                    onChange={e => setA("what_makes_child_happy", e.target.value)} />
                </div>

                <YesNo label="16. Does your child have any known health problem?"
                  value={about.has_health_problem}
                  onChange={v => setA("has_health_problem", v)} />
                {about.has_health_problem && (
                  <div>
                    <label className="t-label">If yes, please describe</label>
                    <textarea className="t-input" rows={2} value={about.health_problem_description}
                      onChange={e => setA("health_problem_description", e.target.value)} style={{ resize: "vertical" }} />
                  </div>
                )}

                <YesNo label="17. Does your child need regular medication?"
                  value={about.needs_regular_medication}
                  onChange={v => setA("needs_regular_medication", v)} />
                {about.needs_regular_medication && (
                  <div>
                    <label className="t-label">If yes, what and when is it given?</label>
                    <input className="t-input" value={about.medication_details}
                      onChange={e => setA("medication_details", e.target.value)} />
                  </div>
                )}

                <div>
                  <label className="t-label">20. My child is scared of</label>
                  <input className="t-input" value={about.child_scared_of}
                    onChange={e => setA("child_scared_of", e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="t-label">Form filled on</label>
                    <input className="t-input" type="date" value={about.form_filled_on}
                      onChange={e => setA("form_filled_on", e.target.value)} />
                  </div>
                  <div>
                    <label className="t-label">Filled by</label>
                    <input className="t-input" placeholder="Name of person filling the form" value={about.filled_by}
                      onChange={e => setA("filled_by", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB 3: DOCUMENTS ===== */}
          {tab === 3 && (
            <div>
              <SectionTitle>Archived Registration Documents</SectionTitle>

              {!isEdit ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <FolderOpen size={40} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
                  <p className="t-text-secondary">Save the student first, then come back to upload documents.</p>
                </div>
              ) : (
                <>
                  <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 16 }}>
                    Upload PDF scans of the physical registration form, medical certificate, or any other documentation for this student's file.
                  </p>

                  {/* Upload button */}
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 18px", borderRadius: 8, background: "var(--accent)",
                    color: "var(--btn-primary-text)", cursor: "pointer",
                    fontSize: "0.8125rem", fontWeight: 600, marginBottom: 20,
                    opacity: uploading ? 0.6 : 1,
                  }}>
                    <Upload size={14} />
                    {uploading ? "Uploading..." : "Upload PDF"}
                    <input type="file" accept=".pdf" style={{ display: "none" }} onChange={uploadDocument} disabled={uploading} />
                  </label>

                  {/* Document list */}
                  {documents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 0", border: "2px dashed var(--border)", borderRadius: 10 }}>
                      <FolderOpen size={36} style={{ color: "var(--text-secondary)", margin: "0 auto 10px" }} />
                      <p className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {documents.map((doc: any) => (
                        <div key={doc.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 14px", borderRadius: 8,
                          border: "1px solid var(--border)", background: "var(--bg-page)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#dc2626" }}>PDF</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p className="t-text-primary font-medium" style={{ fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {doc.original_filename}
                              </p>
                              <p className="t-text-secondary" style={{ fontSize: "0.72rem" }}>
                                {formatSize(doc.file_size)} &nbsp;·&nbsp; {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                            <button
                              onClick={() => viewDocument(doc.id, doc.original_filename)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              disabled={deletingDoc === doc.id}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                            >
                              <Trash2 size={12} /> {deletingDoc === doc.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--border)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {tab > 0 && (
              <button className="t-btn-secondary" style={{ fontSize: "0.8125rem" }} onClick={() => setTab(t => t - 1)}>
                ← Previous
              </button>
            )}
            {tab < 3 && (
              <button className="t-btn-secondary" style={{ fontSize: "0.8125rem" }} onClick={() => setTab(t => t + 1)}>
                Next →
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="t-btn-secondary" onClick={onClose} style={{ fontSize: "0.8125rem" }}>Cancel</button>
            <button className="t-btn-primary" onClick={save} disabled={saving} style={{ fontSize: "0.8125rem" }}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Register Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
