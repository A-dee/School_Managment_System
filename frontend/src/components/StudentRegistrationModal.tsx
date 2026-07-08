"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { X, User, HeartPulse, Smile, FolderOpen } from "lucide-react";

import BasicInfoTab from "./student-registration/BasicInfoTab";
import RegistrationTab from "./student-registration/RegistrationTab";
import MedicalTab from "./student-registration/MedicalTab";
import AboutMeTab from "./student-registration/AboutMeTab";
import DocumentsTab from "./student-registration/DocumentsTab";
import { isParentManagedLevel } from "./student-registration/helpers";

interface Props {
  studentId?: number | null;
  classId?: number | null;
  classes: any[];
  sessions?: any[];
  teacherMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ParentOption = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  children?: { id: number }[];
};

const blankBasic = {
  admission_number: "", first_name: "", last_name: "",
  gender: "MALE", date_of_birth: "", current_class_id: "",
  enrollment_date: new Date().toISOString().split("T")[0],
  guardian_name: "", guardian_phone: "", guardian_email: "",
  parent_link_mode: "GUARDIAN_ONLY",
  existing_parent_id: "",
  create_student_login: true,
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

export default function StudentRegistrationModal({ studentId, classId, classes, sessions = [], teacherMode = false, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [credentialsTitle, setCredentialsTitle] = useState("Student Enrolled");
  const [credentialsMessage, setCredentialsMessage] = useState("Login credentials have been generated. Save these — passwords cannot be recovered.");
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [portalActionLoading, setPortalActionLoading] = useState<"" | "student" | "parent">("");
  const [studentPortalExists, setStudentPortalExists] = useState(false);
  const isEdit = !!studentId;

  const [basic, setBasic] = useState({ ...blankBasic, current_class_id: classId ? String(classId) : "" });
  const [reg, setReg] = useState(blankReg);
  const [med, setMed] = useState(blankMed);
  const [about, setAbout] = useState(blankAbout);
  const selectedClass = classes.find((c: any) => String(c.id) === basic.current_class_id);
  const parentManagedPortal = isParentManagedLevel(selectedClass?.level);
  const hasCredentialDetails = (payload: any) => Boolean(
    payload?.student_email
    || payload?.student_password
    || payload?.parent_email
    || payload?.parent_password
    || payload?.parent_note
  );

  const loadDocuments = async (sid: number) => {
    try {
      const r = await api.get(`/api/v1/students/${sid}/documents`);
      setDocuments(r.data.data || []);
    } catch { /* ignore */ }
  };

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    if (teacherMode) return;
    api.get("/api/v1/parents/", { params: { limit: 500 } })
      .then((res) => setParents(res.data.data || []))
      .catch(() => {});
  }, [teacherMode]);

  useEffect(() => {
    if (parentManagedPortal) {
      setBasic((prev) => ({
        ...prev,
        create_student_login: false,
        parent_link_mode: prev.parent_link_mode === "GUARDIAN_ONLY" ? "NEW_PARENT_PORTAL" : prev.parent_link_mode,
      }));
    }
  }, [parentManagedPortal]);

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
        guardian_name: stu.guardian_name || "",
        guardian_phone: stu.guardian_phone || "",
        guardian_email: stu.guardian_email || "",
        parent_link_mode: "GUARDIAN_ONLY",
        existing_parent_id: "",
        create_student_login: Boolean(stu.user_id),
      });
      setStudentPortalExists(Boolean(stu?.user_id));
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
    if (!teacherMode) {
      if (basic.parent_link_mode === "EXISTING_PARENT" && !basic.existing_parent_id) {
        toast.error("Select the parent/guardian to link");
        setTab(0);
        return;
      }
      if (basic.parent_link_mode === "NEW_PARENT_PORTAL" && !basic.guardian_email) {
        toast.error("Parent email is required to create a parent portal");
        setTab(0);
        return;
      }
      if (parentManagedPortal && basic.parent_link_mode === "GUARDIAN_ONLY") {
        toast.error("This class uses parent-only portal access. Link or create a parent account.");
        setTab(0);
        return;
      }
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
          parent_link_mode: teacherMode ? "GUARDIAN_ONLY" : basic.parent_link_mode,
          existing_parent_id: basic.existing_parent_id ? Number(basic.existing_parent_id) : null,
          create_student_login: teacherMode ? false : basic.create_student_login,
        });
        sid = res.data.data?.id;
        if (!sid) throw new Error("Failed to get student ID");
        const creds = res.data.data?.credentials;
        if (hasCredentialDetails(creds)) {
          setCredentialsTitle("Student Enrolled");
          setCredentialsMessage("Login credentials have been generated. Save these — passwords cannot be recovered.");
          setCredentials(creds);
        }
      } else {
        await api.put(`/api/v1/students/${sid}`, {
          first_name: basic.first_name,
          last_name: basic.last_name,
          date_of_birth: basic.date_of_birth || null,
          current_class_id: basic.current_class_id ? Number(basic.current_class_id) : null,
          guardian_name: basic.guardian_name || null,
          guardian_phone: basic.guardian_phone || null,
          guardian_email: basic.guardian_email || null,
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

      const puts = [
        api.put(`/api/v1/students/${sid}/registration`, regPayload),
        api.put(`/api/v1/students/${sid}/about-me`, aboutPayload),
      ];
      if (!teacherMode) puts.push(api.put(`/api/v1/students/${sid}/medical`, medPayload));
      await Promise.all(puts);

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

  const createStudentPortalLater = async () => {
    if (!studentId) return;
    setPortalActionLoading("student");
    try {
      const res = await api.post(`/api/v1/students/${studentId}/create-student-portal`);
      setStudentPortalExists(true);
      setCredentialsTitle("Student Portal Created");
      setCredentialsMessage("A login has now been created for this student. Save these credentials — passwords cannot be recovered.");
      setCredentials(res.data.data || {});
      toast.success("Student portal created");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create student portal");
    }
    setPortalActionLoading("");
  };

  const createParentPortalLater = async () => {
    if (!studentId) return;
    if (basic.parent_link_mode === "EXISTING_PARENT" && !basic.existing_parent_id) {
      toast.error("Select an existing parent first");
      return;
    }
    if (basic.parent_link_mode !== "EXISTING_PARENT" && !basic.guardian_email) {
      toast.error("Guardian email is required to create a parent portal");
      return;
    }
    setPortalActionLoading("parent");
    try {
      const payload = basic.parent_link_mode === "EXISTING_PARENT"
        ? { existing_parent_id: Number(basic.existing_parent_id) }
        : {
            guardian_name: basic.guardian_name || null,
            guardian_phone: basic.guardian_phone || null,
            guardian_email: basic.guardian_email || null,
          };
      const res = await api.post(`/api/v1/students/${studentId}/create-parent-portal`, payload);
      const data = res.data.data || {};
      if (data.parent_password || data.parent_note) {
        setCredentialsTitle(data.parent_password ? "Parent Portal Created" : "Parent Linked");
        setCredentialsMessage(data.parent_password
          ? "A parent portal is now available for this student. Save these credentials — passwords cannot be recovered."
          : "This student has been linked to an existing parent account.");
        setCredentials(data);
      }
      toast.success(data.parent_password ? "Parent portal created" : "Parent linked");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create parent portal");
    }
    setPortalActionLoading("");
  };

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

  const ALL_TABS = [
    { label: "Registration Form", icon: User },
    { label: "Medical Information", icon: HeartPulse },
    { label: "About Me", icon: Smile },
    { label: "Documents", icon: FolderOpen },
  ];
  const TABS = teacherMode
    ? ALL_TABS.filter(t => t.label === "Registration Form" || t.label === "About Me")
    : ALL_TABS;
  // Map visible tab index to actual tab index
  const TAB_INDEX_MAP = teacherMode ? [0, 2] : [0, 1, 2, 3];

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
      <div className="modal-overlay">
        <div className="modal-box-sm" style={{ background: "var(--bg-card)", borderRadius: 14, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <span style={{ fontSize: "1.5rem" }}>✓</span>
            </div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: 4 }}>{credentialsTitle}</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {credentialsMessage}
            </p>
          </div>

          {credentials.student_email && <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)", marginBottom: 10 }}>Student Account</p>
            <Row label="Email / Username" value={credentials.student_email} />
            <Row label="Password" value={credentials.student_password} />
          </div>}

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
                const txt = (credentials.student_email
                  ? `STUDENT LOGIN\nEmail: ${credentials.student_email}\nPassword: ${credentials.student_password}`
                  : "") +
                  (credentials.parent_email
                    ? `${credentials.student_email ? "\n\n" : ""}PARENT LOGIN\nEmail: ${credentials.parent_email}\nPassword: ${credentials.parent_password || "(existing account)"}`
                    : "");
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
    <div className="modal-overlay">
      <div className="modal-box-lg" style={{
        background: "var(--bg-card)", borderRadius: 14,
        maxHeight: "92vh", maxWidth: "min(1120px, calc(100vw - 32px))", display: "flex", flexDirection: "column",
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
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
            {TABS.map((t, i) => {
              const Icon = t.icon;
              const actualIndex = TAB_INDEX_MAP[i];
              return (
                <button key={i} onClick={() => setTab(actualIndex)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                  background: "none", border: "none", cursor: "pointer", flexShrink: 0,
                  borderBottom: tab === actualIndex ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === actualIndex ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: tab === actualIndex ? 700 : 400,
                  fontSize: "0.8125rem", marginBottom: -1,
                  transition: "color 0.15s",
                }}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {tab === 0 && (
            <>
              <BasicInfoTab
                basic={basic}
                reg={reg}
                setB={setB}
                setR={setR}
                isEdit={isEdit}
                teacherMode={teacherMode}
                classes={classes}
                sessions={sessions}
                parents={parents}
                parentManagedPortal={parentManagedPortal}
                studentPortalExists={studentPortalExists}
                portalActionLoading={portalActionLoading}
                createStudentPortalLater={createStudentPortalLater}
                createParentPortalLater={createParentPortalLater}
              />
              <RegistrationTab
                reg={reg}
                setR={setR}
              />
            </>
          )}

          {tab === 1 && (
            <MedicalTab
              med={med}
              setM={setM}
            />
          )}

          {tab === 2 && (
            <AboutMeTab
              about={about}
              setA={setA}
            />
          )}

          {tab === 3 && (
            <DocumentsTab
              isEdit={isEdit}
              uploading={uploading}
              deletingDoc={deletingDoc}
              documents={documents}
              uploadDocument={uploadDocument}
              viewDocument={viewDocument}
              deleteDocument={deleteDocument}
            />
          )}
        </div>

        {/* Footer */}
        {/* Data processing notice */}
        <div style={{ padding: "10px 24px 0", flexShrink: 0 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            🔒 <strong>Data Notice:</strong> The personal and medical information entered here is processed by Hope Hills Academy solely for school management purposes, in accordance with our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Privacy Policy</a>
            {" "}and the Nigeria Data Protection Act 2023. By saving, you confirm that the parent/guardian has been informed and has consented to the processing of their child&apos;s data.
          </p>
        </div>

        <div style={{
          padding: "12px 24px 16px", flexShrink: 0,
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
