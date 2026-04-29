"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Save, Send, PlusCircle, Trash2, BookOpen, ChevronRight } from "lucide-react";

/* ── Grading system (matches report card exactly) ─────────────────── */
const gradeLabel = (total: number) => {
  if (total >= 70) return { g: "A", color: "#16a34a", bg: "rgba(34,197,94,0.12)" };
  if (total >= 60) return { g: "B", color: "#2563eb", bg: "rgba(37,99,235,0.1)"  };
  if (total >= 50) return { g: "C", color: "#d97706", bg: "rgba(245,158,11,0.1)"  };
  if (total >= 40) return { g: "D", color: "#ea580c", bg: "rgba(234,88,12,0.1)"   };
  return            { g: "F", color: "#dc2626", bg: "rgba(220,38,38,0.1)"   };
};

type ScoreRow = { ca: string; exam: string; resultId: number | null; saving: boolean };
type Assignment = { id: number; teacher_id: number; subject_id: number; class_id: number };

export default function TeacherResultsPage() {
  /* ── data ── */
  const [myStaff,    setMyStaff]    = useState<any>(null);
  const [myClass,    setMyClass]    = useState<any>(null);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions,   setSessions]   = useState<any[]>([]);
  const [terms,      setTerms]      = useState<any[]>([]);
  const [students,   setStudents]   = useState<any[]>([]);
  const [scores,     setScores]     = useState<Record<number, ScoreRow>>({});

  /* ── selections ── */
  const [selSubjectAssign, setSelSubjectAssign] = useState("");   // assignment id
  const [selSession,       setSelSession]       = useState("");
  const [selTerm,          setSelTerm]          = useState("");
  const [loaded,  setLoaded]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ── subject registration ── */
  const [tab,            setTab]          = useState<"results" | "subjects">("results");
  const [addSubjectId,   setAddSubjectId] = useState("");
  const [addingSubject,  setAddingSubject] = useState(false);
  const [removingId,     setRemovingId]   = useState<number | null>(null);

  /* ── boot ── */
  useEffect(() => {
    Promise.allSettled([
      api.get("/api/v1/auth/me"),
      api.get("/api/v1/subjects/assignments"),
      api.get("/api/v1/subjects/"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
    ]).then(([me, asgn, subj, sess, trms]) => {
      const userId = me.status === "fulfilled" ? me.value.data.data?.id : null;

      if (asgn.status === "fulfilled") setAssignments(asgn.value.data.data || []);
      if (subj.status === "fulfilled") setAllSubjects(subj.value.data.data || []);
      if (sess.status === "fulfilled") setSessions(sess.value.data.data || []);
      if (trms.status === "fulfilled") setTerms(trms.value.data.data || []);

      /* find teacher's class */
      if (userId) {
        api.get("/api/v1/staff/").then(r => {
          const staffList: any[] = r.data.data || [];
          const myS = staffList.find((s: any) => s.user_id === userId);
          if (myS) {
            setMyStaff(myS);
            api.get("/api/v1/classes?limit=200").then(cr => {
              const cls = (cr.data.data || []).find((c: any) => c.class_teacher_id === myS.id);
              if (cls) setMyClass(cls);
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    });
  }, []);

  const reloadAssignments = async () => {
    const r = await api.get("/api/v1/subjects/assignments");
    setAssignments(r.data.data || []);
  };

  const subjectName  = (id: number) => allSubjects.find(s => s.id === id)?.name || `Subject #${id}`;
  const myAssignments = assignments.filter(a => myStaff && a.teacher_id === myStaff.id);
  const selectedAssignment = myAssignments.find(a => String(a.id) === selSubjectAssign);

  /* ── register a subject ── */
  const addSubject = async () => {
    if (!addSubjectId || !myStaff || !myClass) { toast.error("Select a subject first"); return; }
    setAddingSubject(true);
    try {
      await api.post("/api/v1/subjects/assignments", {
        teacher_id: myStaff.id,
        subject_id: parseInt(addSubjectId),
        class_id:   myClass.id,
      });
      toast.success("Subject registered");
      setAddSubjectId("");
      await reloadAssignments();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to register"); }
    setAddingSubject(false);
  };

  const removeSubject = async (assignId: number, name: string) => {
    if (!confirm(`Remove "${name}" from your class subjects?`)) return;
    setRemovingId(assignId);
    try {
      await api.delete(`/api/v1/subjects/assignments/${assignId}`);
      toast.success("Subject removed");
      await reloadAssignments();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setRemovingId(null);
  };

  /* ── load results ── */
  const loadResults = async () => {
    if (!selectedAssignment || !selSession || !selTerm) {
      toast.error("Select a subject, session and term first"); return;
    }
    setLoading(true); setLoaded(false);
    try {
      const [stuRes, resRes] = await Promise.all([
        api.get(`/api/v1/students/?class_id=${selectedAssignment.class_id}&limit=200`),
        api.get(`/api/v1/results/class/${selectedAssignment.class_id}`, {
          params: { term_id: Number(selTerm), session_id: Number(selSession) },
        }),
      ]);
      const stuList: any[] = stuRes.data.data || [];
      const results: any[] = resRes.data.data || [];
      setStudents(stuList);
      const scoreMap: Record<number, ScoreRow> = {};
      for (const stu of stuList) {
        const ex = results.find(r => r.student_id === stu.id && r.subject_id === selectedAssignment.subject_id);
        scoreMap[stu.id] = { ca: ex ? String(ex.ca_score) : "", exam: ex ? String(ex.exam_score) : "", resultId: ex ? ex.id : null, saving: false };
      }
      setScores(scoreMap);
      setLoaded(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to load results"); }
    setLoading(false);
  };

  const setScore = (studentId: number, field: "ca" | "exam", value: string) =>
    setScores(p => ({ ...p, [studentId]: { ...p[studentId], [field]: value } }));

  const computeTotal = (row: ScoreRow) => (Number(row?.ca) || 0) + (Number(row?.exam) || 0);

  const saveRow = async (studentId: number) => {
    const row = scores[studentId];
    if (!row || !selectedAssignment) return;
    const ca = Number(row.ca) || 0;
    const exam = Number(row.exam) || 0;
    if (ca > 40) { toast.error("CA score cannot exceed 40"); return; }
    if (exam > 60) { toast.error("Exam score cannot exceed 60"); return; }
    setScores(p => ({ ...p, [studentId]: { ...p[studentId], saving: true } }));
    try {
      if (row.resultId) {
        await api.put(`/api/v1/results/${row.resultId}`, { ca_score: ca, exam_score: exam });
      } else {
        const res = await api.post("/api/v1/results/", {
          student_id: studentId,
          subject_id: selectedAssignment.subject_id,
          class_id:   selectedAssignment.class_id,
          session_id: Number(selSession),
          term_id:    Number(selTerm),
          ca_score: ca, exam_score: exam,
        });
        const newId = res.data.data?.id || null;
        setScores(p => ({ ...p, [studentId]: { ...p[studentId], resultId: newId } }));
      }
      toast.success("Saved");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to save"); }
    setScores(p => ({ ...p, [studentId]: { ...p[studentId], saving: false } }));
  };

  const saveAll = async () => {
    for (const stu of students) {
      const row = scores[stu.id];
      if (row && (row.ca !== "" || row.exam !== "")) await saveRow(stu.id);
    }
    toast.success("All results saved");
  };

  const submitForApproval = async () => {
    if (!selectedAssignment || !selTerm) return;
    setSubmitting(true);
    try {
      await api.post("/api/v1/results/submit", null, {
        params: { class_id: selectedAssignment.class_id, subject_id: selectedAssignment.subject_id, term_id: Number(selTerm) },
      });
      toast.success("Results submitted for approval");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to submit"); }
    setSubmitting(false);
  };

  /* ── unregistered subjects (for dropdown) ── */
  const registeredSubjectIds = new Set(myAssignments.map(a => a.subject_id));
  const unregisteredSubjects = allSubjects.filter(s => s.status === "APPROVED" && !registeredSubjectIds.has(s.id));

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Results Entry</h1>
          <p className="t-page-subtitle">
            {myClass ? `Class: ${myClass.name} (${myClass.level})` : "Loading class…"}
            &nbsp;·&nbsp; CA (40) + Exam (60) = Total (100)
          </p>
        </div>
      </div>

      {/* Grade key banner */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { g: "A", range: "70–100", ...gradeLabel(75) },
          { g: "B", range: "60–69",  ...gradeLabel(65) },
          { g: "C", range: "50–59",  ...gradeLabel(55) },
          { g: "D", range: "40–49",  ...gradeLabel(45) },
          { g: "F", range: "0–39",   ...gradeLabel(30) },
        ].map(({ g, range, color, bg }) => (
          <div key={g} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: bg, border: `1px solid ${color}30` }}>
            <span style={{ fontWeight: 800, fontSize: "0.875rem", color }}>{g}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{range}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
          Grade key from report card
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {([["results", "Enter Scores"], ["subjects", "My Subjects"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: "0.8125rem", fontWeight: 600,
            background: tab === key ? "var(--accent)" : "var(--accent-light)",
            color: tab === key ? "var(--btn-primary-text)" : "var(--accent)",
          }}>{label}</button>
        ))}
      </div>

      {/* ══ TAB: My Subjects ══ */}
      {tab === "subjects" && (
        <div className="t-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", marginBottom: 4 }}>
              Subjects I Teach
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Register each subject you teach to your class. Only registered subjects appear in the results entry list.
            </p>
          </div>

          {/* Registered subjects list */}
          {myAssignments.length === 0 ? (
            <div style={{ padding: "24px", border: "1px dashed var(--border)", borderRadius: 10, textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
              <BookOpen size={32} style={{ opacity: 0.2, display: "block", margin: "0 auto 8px" }} />
              No subjects registered yet. Add your class subjects below.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myAssignments.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--bg-main)", border: "1px solid var(--border)" }}>
                  <BookOpen size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{subjectName(a.subject_id)}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                    {myClass ? `${myClass.name} (${myClass.level})` : `Class #${a.class_id}`}
                  </span>
                  <button
                    onClick={() => removeSubject(a.id, subjectName(a.subject_id))}
                    disabled={removingId === a.id}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                  >
                    <Trash2 size={11} />{removingId === a.id ? "…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add subject */}
          {!myClass ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
              You need to be assigned as a class teacher to register subjects.
            </p>
          ) : (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)", marginBottom: 10 }}>Add a Subject</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  className="t-input"
                  style={{ flex: 1, minWidth: 200 }}
                  value={addSubjectId}
                  onChange={e => setAddSubjectId(e.target.value)}
                >
                  <option value="">Select subject to add…</option>
                  {unregisteredSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={addSubject}
                  disabled={addingSubject || !addSubjectId}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 9, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem" }}
                >
                  <PlusCircle size={14} />{addingSubject ? "Adding…" : "Add Subject"}
                </button>
              </div>
              {unregisteredSubjects.length === 0 && allSubjects.filter(s => s.status === "APPROVED").length > 0 && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 8 }}>All approved subjects are already registered.</p>
              )}
              {allSubjects.filter(s => s.status === "APPROVED").length === 0 && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 8 }}>No approved subjects exist yet. Ask your principal to approve subjects first.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: Enter Scores ══ */}
      {tab === "results" && (
        <>
          {myAssignments.length === 0 ? (
            <div className="t-card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <BookOpen size={40} style={{ opacity: 0.2, margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>No subjects registered yet.</p>
              <button onClick={() => setTab("subjects")} style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem" }}>
                <ChevronRight size={14} /> Go to My Subjects
              </button>
            </div>
          ) : (
            <>
              {/* Selectors */}
              <div className="t-card mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="t-label">Subject *</label>
                    <select className="t-input" value={selSubjectAssign} onChange={e => { setSelSubjectAssign(e.target.value); setLoaded(false); }}>
                      <option value="">— Select subject —</option>
                      {myAssignments.map(a => (
                        <option key={a.id} value={a.id}>{subjectName(a.subject_id)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="t-label">Session *</label>
                    <select className="t-input" value={selSession} onChange={e => { setSelSession(e.target.value); setLoaded(false); }}>
                      <option value="">— Select —</option>
                      {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="t-label">Term *</label>
                    <select className="t-input" value={selTerm} onChange={e => { setSelTerm(e.target.value); setLoaded(false); }}>
                      <option value="">— Select —</option>
                      {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button className="t-btn-primary w-full" onClick={loadResults} disabled={loading}>
                      {loading ? "Loading…" : "Load Students"}
                    </button>
                  </div>
                </div>
              </div>

              {loaded && (
                <div className="t-card overflow-x-auto">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                        {subjectName(selectedAssignment?.subject_id ?? 0)}
                      </h2>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        {myClass ? `${myClass.name} (${myClass.level})` : ""} · {students.length} students
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--accent-light)", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                        onClick={saveAll}
                      >
                        <Save size={13} /> Save All
                      </button>
                      <button
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                        onClick={submitForApproval} disabled={submitting}
                      >
                        <Send size={13} />{submitting ? "Submitting…" : "Submit for Approval"}
                      </button>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <p className="t-text-secondary text-center py-8">No students in this class yet.</p>
                  ) : (
                    <table className="t-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student</th>
                          <th>Adm. No.</th>
                          <th style={{ width: 120 }}>CA <span style={{ fontWeight: 400, fontSize: "0.7rem" }}>(max 40)</span></th>
                          <th style={{ width: 130 }}>Exam <span style={{ fontWeight: 400, fontSize: "0.7rem" }}>(max 60)</span></th>
                          <th style={{ width: 80 }}>Total</th>
                          <th style={{ width: 64 }}>Grade</th>
                          <th style={{ width: 90 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((stu: any, idx: number) => {
                          const row = scores[stu.id] || { ca: "", exam: "", resultId: null, saving: false };
                          const total = computeTotal(row);
                          const hasScore = row.ca !== "" || row.exam !== "";
                          const { g, color, bg } = gradeLabel(total);
                          return (
                            <tr key={stu.id}>
                              <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{idx + 1}</td>
                              <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{stu.first_name} {stu.last_name}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{stu.admission_number}</td>
                              <td>
                                <input
                                  className="t-input"
                                  type="number" min={0} max={40}
                                  style={{ padding: "4px 8px", fontSize: "0.8125rem", width: 90 }}
                                  placeholder="0"
                                  value={row.ca}
                                  onChange={e => setScore(stu.id, "ca", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  className="t-input"
                                  type="number" min={0} max={60}
                                  style={{ padding: "4px 8px", fontSize: "0.8125rem", width: 90 }}
                                  placeholder="0"
                                  value={row.exam}
                                  onChange={e => setScore(stu.id, "exam", e.target.value)}
                                />
                              </td>
                              <td style={{ fontWeight: 700, fontSize: "0.9375rem", color: hasScore ? color : "var(--text-secondary)" }}>
                                {hasScore ? total : "—"}
                              </td>
                              <td>
                                {hasScore && (
                                  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 6, background: bg, color, fontWeight: 800, fontSize: "0.8125rem" }}>
                                    {g}
                                  </span>
                                )}
                              </td>
                              <td>
                                <button
                                  onClick={() => saveRow(stu.id)}
                                  disabled={row.saving}
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: row.resultId ? "rgba(34,197,94,0.1)" : "var(--accent-light)", color: row.resultId ? "#16a34a" : "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                                >
                                  <Save size={11} />{row.saving ? "…" : row.resultId ? "Update" : "Save"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
