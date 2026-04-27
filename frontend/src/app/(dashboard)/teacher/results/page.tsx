"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Save, Send } from "lucide-react";

type ScoreRow = { ca: string; exam: string; resultId: number | null; saving: boolean };

export default function TeacherResultsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<number, ScoreRow>>({});

  const [selAssignment, setSelAssignment] = useState("");
  const [selSession, setSelSession] = useState("");
  const [selTerm, setSelTerm] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/subjects/assignments"),
      api.get("/api/v1/subjects/"),
      api.get("/api/v1/classes/?limit=200"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
    ]).then(([a, s, c, ses, t]) => {
      setAssignments(a.data.data || []);
      setSubjects(s.data.data || []);
      setClasses(c.data.data || []);
      setSessions(ses.data.data || []);
      setTerms(t.data.data || []);
    }).catch(() => toast.error("Failed to load data"));
  }, []);

  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name || `Subject #${id}`;
  const getClassName = (id: number) => classes.find((c: any) => c.id === id)?.name || `Class #${id}`;

  const selectedAssignment = assignments.find((a: any) => String(a.id) === selAssignment);

  const loadResults = async () => {
    if (!selAssignment || !selSession || !selTerm) {
      toast.error("Select a subject, session and term first");
      return;
    }
    const asgn = selectedAssignment;
    if (!asgn) return;
    setLoading(true);
    setLoaded(false);
    try {
      const [stuRes, resRes] = await Promise.all([
        api.get(`/api/v1/students/?class_id=${asgn.class_id}&limit=200`),
        api.get(`/api/v1/results/class/${asgn.class_id}`, {
          params: { term_id: Number(selTerm), session_id: Number(selSession) },
        }),
      ]);
      const stuList: any[] = stuRes.data.data || [];
      const results: any[] = resRes.data.data || [];
      setStudents(stuList);

      const scoreMap: Record<number, ScoreRow> = {};
      for (const stu of stuList) {
        const existing = results.find(
          (r: any) => r.student_id === stu.id && r.subject_id === asgn.subject_id
        );
        scoreMap[stu.id] = {
          ca: existing ? String(existing.ca_score) : "",
          exam: existing ? String(existing.exam_score) : "",
          resultId: existing ? existing.id : null,
          saving: false,
        };
      }
      setScores(scoreMap);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load results");
    }
    setLoading(false);
  };

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
          class_id: selectedAssignment.class_id,
          session_id: Number(selSession),
          term_id: Number(selTerm),
          ca_score: ca,
          exam_score: exam,
        });
        const newId = res.data.data?.id || null;
        setScores(p => ({ ...p, [studentId]: { ...p[studentId], resultId: newId } }));
      }
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    }
    setScores(p => ({ ...p, [studentId]: { ...p[studentId], saving: false } }));
  };

  const saveAll = async () => {
    for (const stu of students) {
      const row = scores[stu.id];
      if (row && (row.ca !== "" || row.exam !== "")) {
        await saveRow(stu.id);
      }
    }
    toast.success("All results saved");
  };

  const submitForApproval = async () => {
    if (!selectedAssignment || !selTerm) return;
    setSubmitting(true);
    try {
      await api.post("/api/v1/results/submit", null, {
        params: {
          class_id: selectedAssignment.class_id,
          subject_id: selectedAssignment.subject_id,
          term_id: Number(selTerm),
        },
      });
      toast.success("Results submitted for approval");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  const setScore = (studentId: number, field: "ca" | "exam", value: string) => {
    setScores(p => ({ ...p, [studentId]: { ...p[studentId], [field]: value } }));
  };

  const computeTotal = (row: ScoreRow) => {
    const ca = Number(row?.ca) || 0;
    const exam = Number(row?.exam) || 0;
    return ca + exam;
  };

  const gradeLabel = (total: number) => {
    if (total >= 70) return { g: "A", color: "badge-green" };
    if (total >= 60) return { g: "B", color: "badge-blue" };
    if (total >= 50) return { g: "C", color: "badge-yellow" };
    if (total >= 40) return { g: "D", color: "badge-yellow" };
    return { g: "F", color: "badge-red" };
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Enter Results</h1>
          <p className="t-page-subtitle">CA (40) + Exam (60) = Total (100)</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="t-card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="t-label">Subject / Class *</label>
            <select className="t-input" value={selAssignment} onChange={e => { setSelAssignment(e.target.value); setLoaded(false); }}>
              <option value="">— Select —</option>
              {assignments.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {getSubjectName(a.subject_id)} · {getClassName(a.class_id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="t-label">Session *</label>
            <select className="t-input" value={selSession} onChange={e => { setSelSession(e.target.value); setLoaded(false); }}>
              <option value="">— Select —</option>
              {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Term *</label>
            <select className="t-input" value={selTerm} onChange={e => { setSelTerm(e.target.value); setLoaded(false); }}>
              <option value="">— Select —</option>
              {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="t-btn-primary w-full" onClick={loadResults} disabled={loading}>
              {loading ? "Loading..." : "Load Students"}
            </button>
          </div>
        </div>
      </div>

      {loaded && (
        <>
          <div className="t-card overflow-x-auto">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 className="font-semibold t-text-primary">
                {getSubjectName(selectedAssignment?.subject_id)} — {getClassName(selectedAssignment?.class_id)}
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="t-btn-secondary" style={{ fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: 5 }} onClick={saveAll}>
                  <Save size={14} /> Save All
                </button>
                <button className="t-btn-primary" style={{ fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: 5 }}
                  onClick={submitForApproval} disabled={submitting}>
                  <Send size={14} /> {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <p className="t-text-secondary text-center py-8">No students in this class yet.</p>
            ) : (
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Adm. No.</th>
                    <th style={{ width: 120 }}>CA (max 40)</th>
                    <th style={{ width: 130 }}>Exam (max 60)</th>
                    <th style={{ width: 80 }}>Total</th>
                    <th style={{ width: 60 }}>Grade</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu: any) => {
                    const row = scores[stu.id] || { ca: "", exam: "", resultId: null, saving: false };
                    const total = computeTotal(row);
                    const { g, color } = gradeLabel(total);
                    return (
                      <tr key={stu.id}>
                        <td className="font-medium t-text-primary">{stu.first_name} {stu.last_name}</td>
                        <td className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{stu.admission_number}</td>
                        <td>
                          <input
                            className="t-input"
                            type="number"
                            min={0}
                            max={40}
                            style={{ padding: "4px 8px", fontSize: "0.8125rem", width: 90 }}
                            placeholder="0"
                            value={row.ca}
                            onChange={e => setScore(stu.id, "ca", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="t-input"
                            type="number"
                            min={0}
                            max={60}
                            style={{ padding: "4px 8px", fontSize: "0.8125rem", width: 90 }}
                            placeholder="0"
                            value={row.exam}
                            onChange={e => setScore(stu.id, "exam", e.target.value)}
                          />
                        </td>
                        <td className="font-semibold t-text-primary" style={{ fontSize: "0.9rem" }}>
                          {row.ca !== "" || row.exam !== "" ? total : "—"}
                        </td>
                        <td>
                          {(row.ca !== "" || row.exam !== "") && (
                            <span className={color} style={{ fontSize: "0.75rem" }}>{g}</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => saveRow(stu.id)}
                            disabled={row.saving}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                          >
                            <Save size={11} /> {row.saving ? "..." : row.resultId ? "Update" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
