"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { BarChart3, TrendingUp, Users, Award, BookOpen } from "lucide-react";

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444",
};
const GRADE_LABELS: Record<string, string> = {
  A: "Excellent (A)", B: "Very Good (B)", C: "Good (C)", D: "Fair (D)", F: "Fail (F)",
};

export default function AnalyticsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [selClass, setSelClass] = useState("");
  const [selSession, setSelSession] = useState("");
  const [selTerm, setSelTerm] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get("/api/v1/classes/?limit=200"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
      api.get("/api/v1/subjects/"),
      api.get("/api/v1/staff/?limit=200"),
    ]).then(([c, s, t, sub, st]) => {
      if (c.status   === "fulfilled") setClasses(c.value.data.data   || []);
      if (s.status   === "fulfilled") setSessions(s.value.data.data  || []);
      if (t.status   === "fulfilled") setTerms(t.value.data.data     || []);
      if (sub.status === "fulfilled") setSubjects(sub.value.data.data || []);
      if (st.status  === "fulfilled") setStaff(st.value.data.data    || []);
    });
  }, []);

  const load = async () => {
    if (!selClass || !selSession || !selTerm) {
      toast.error("Select class, session and term"); return;
    }
    setLoading(true);
    setLoaded(false);
    try {
      const [stuRes, resRes] = await Promise.all([
        api.get(`/api/v1/students/?class_id=${selClass}&limit=500`),
        api.get(`/api/v1/results/class/${selClass}`, {
          params: { session_id: Number(selSession), term_id: Number(selTerm) },
        }),
      ]);
      setStudents(stuRes.data.data || []);
      setResults(resRes.data.data || []);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load results");
    }
    setLoading(false);
  };

  const getClass = (id: string) => classes.find(c => String(c.id) === id);
  const getSubject = (id: number) => subjects.find(s => s.id === id);
  const getStudent = (id: number) => students.find(s => s.id === id);

  // ── Computed analytics ──────────────────────────────────────────────────────
  const totalScores = results.map(r => Number(r.total_score));
  const overallAvg = avg(totalScores);

  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach(r => { const g = r.grade || "F"; gradeCount[g] = (gradeCount[g] || 0) + 1; });

  const passCount = results.filter(r => Number(r.total_score) >= 40).length;
  const passRate = pct(passCount, results.length);

  // By subject
  const subjectMap: Record<number, number[]> = {};
  results.forEach(r => {
    if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = [];
    subjectMap[r.subject_id].push(Number(r.total_score));
  });
  const subjectStats = Object.entries(subjectMap).map(([sid, scores]) => ({
    subject: getSubject(Number(sid)),
    avg: avg(scores),
    count: scores.length,
    pass: pct(scores.filter(s => s >= 40).length, scores.length),
  })).sort((a, b) => b.avg - a.avg);

  // By student — average across all subjects
  const studentMap: Record<number, number[]> = {};
  results.forEach(r => {
    if (!studentMap[r.student_id]) studentMap[r.student_id] = [];
    studentMap[r.student_id].push(Number(r.total_score));
  });
  const studentStats = Object.entries(studentMap).map(([sid, scores]) => {
    const stu = getStudent(Number(sid));
    return { student: stu, avg: avg(scores), subjects: scores.length, position: results.find(r => r.student_id === Number(sid))?.class_position };
  }).sort((a, b) => b.avg - a.avg);

  // Class teacher
  const cls = getClass(selClass);
  const classTeacher = cls?.class_teacher_id ? staff.find(s => s.id === cls.class_teacher_id) : null;

  // Session + term labels
  const sessionName = sessions.find(s => String(s.id) === selSession)?.name || selSession;
  const termName = terms.find(t => String(t.id) === selTerm)?.name || selTerm;

  const totalSubjects = Object.keys(subjectMap).length;
  const studentsWithResults = Object.keys(studentMap).length;

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Class Performance Analytics</h1>
          <p className="t-page-subtitle">Evaluate class and teacher performance by term</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="t-card mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="t-label">Class *</label>
            <select className="t-input" value={selClass} onChange={e => { setSelClass(e.target.value); setLoaded(false); }}>
              <option value="">— Select class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Session *</label>
            <select className="t-input" value={selSession} onChange={e => { setSelSession(e.target.value); setLoaded(false); }}>
              <option value="">— Select session —</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Term *</label>
            <select className="t-input" value={selTerm} onChange={e => { setSelTerm(e.target.value); setLoaded(false); }}>
              <option value="">— Select term —</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="t-btn-primary w-full" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {loaded && (
        <>
          {/* Class info banner */}
          <div className="t-card mb-4" style={{ background: "var(--accent)", color: "var(--btn-primary-text)", border: "none" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: 2 }}>Class</p>
                <p style={{ fontWeight: 700, fontSize: "1.0625rem" }}>{cls?.name} ({cls?.level})</p>
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: 2 }}>Session / Term</p>
                <p style={{ fontWeight: 600 }}>{sessionName} &middot; {termName}</p>
              </div>
              {classTeacher && (
                <div>
                  <p style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: 2 }}>Class Teacher</p>
                  <p style={{ fontWeight: 600 }}>{classTeacher.full_name}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: 2 }}>Students Enrolled</p>
                <p style={{ fontWeight: 700, fontSize: "1.0625rem" }}>{students.length}</p>
              </div>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="t-card text-center py-12">
              <BarChart3 size={40} style={{ color: "var(--text-secondary)", margin: "0 auto 10px" }} />
              <p className="t-text-secondary">No results submitted for this class and term yet.</p>
            </div>
          ) : (
            <>
              {/* Summary KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Students Tested", value: studentsWithResults, icon: Users, color: "var(--accent)" },
                  { label: "Overall Average", value: `${overallAvg.toFixed(1)}%`, icon: TrendingUp, color: overallAvg >= 70 ? "#22c55e" : overallAvg >= 50 ? "#f59e0b" : "#ef4444" },
                  { label: "Pass Rate", value: `${passRate}%`, icon: Award, color: passRate >= 70 ? "#22c55e" : "#f59e0b" },
                  { label: "Subjects Tested", value: totalSubjects, icon: BookOpen, color: "var(--accent)" },
                ].map(card => (
                  <div key={card.label} className="t-card" style={{ textAlign: "center", padding: "16px 12px" }}>
                    <card.icon size={24} style={{ color: card.color, margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, color: card.color }}>{card.value}</p>
                    <p className="t-text-secondary" style={{ fontSize: "0.75rem", marginTop: 2 }}>{card.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Grade Distribution */}
                <div className="t-card">
                  <h2 className="font-semibold t-text-primary mb-4" style={{ fontSize: "0.9375rem" }}>Grade Distribution</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["A", "B", "C", "D", "F"].map(g => {
                      const count = gradeCount[g] || 0;
                      const p = pct(count, results.length);
                      return (
                        <div key={g}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: GRADE_COLORS[g] }}>{GRADE_LABELS[g]}</span>
                            <span className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{count} ({p}%)</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: "var(--border)" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: GRADE_COLORS[g], width: `${p}%`, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 10 Students */}
                <div className="t-card">
                  <h2 className="font-semibold t-text-primary mb-4" style={{ fontSize: "0.9375rem" }}>Student Ranking</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                    {studentStats.slice(0, 10).map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          background: i === 0 ? "#f59e0b" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "var(--accent-light)",
                          color: i < 3 ? "#fff" : "var(--accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.7rem", fontWeight: 700,
                        }}>{i + 1}</span>
                        <span className="t-text-primary" style={{ fontSize: "0.8125rem", flex: 1 }}>
                          {s.student ? `${s.student.first_name} ${s.student.last_name}` : `Student #${Object.keys(studentMap)[i]}`}
                        </span>
                        <span style={{
                          fontSize: "0.8125rem", fontWeight: 700,
                          color: s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#f59e0b" : "#ef4444",
                        }}>{s.avg.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subject Analysis */}
              <div className="t-card mb-4">
                <h2 className="font-semibold t-text-primary mb-4" style={{ fontSize: "0.9375rem" }}>Subject Performance Analysis</h2>
                <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 14 }}>
                  Use this table to identify which subjects may need extra attention or teacher support.
                </p>
                <div className="overflow-x-auto">
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th style={{ textAlign: "center" }}>Students</th>
                        <th style={{ textAlign: "center" }}>Avg Score</th>
                        <th style={{ textAlign: "center" }}>Pass Rate</th>
                        <th style={{ width: 160 }}>Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectStats.map((s, i) => (
                        <tr key={i}>
                          <td className="font-medium t-text-primary">
                            {s.subject?.name || `Subject #${Object.keys(subjectMap)[i]}`}
                          </td>
                          <td className="t-text-secondary" style={{ textAlign: "center" }}>{s.count}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#f59e0b" : "#ef4444" }}>
                            {s.avg.toFixed(1)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={s.pass >= 70 ? "badge-green" : s.pass >= 50 ? "badge-yellow" : "badge-red"}>
                              {s.pass}%
                            </span>
                          </td>
                          <td>
                            <div style={{ height: 8, borderRadius: 4, background: "var(--border)" }}>
                              <div style={{
                                height: "100%", borderRadius: 4, width: `${s.avg}%`,
                                background: s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#f59e0b" : "#ef4444",
                                transition: "width 0.4s ease",
                              }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Full student results table */}
              <div className="t-card">
                <h2 className="font-semibold t-text-primary mb-4" style={{ fontSize: "0.9375rem" }}>All Student Results</h2>
                <div className="overflow-x-auto">
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Adm. No.</th>
                        {subjectStats.map((s, i) => (
                          <th key={i} style={{ fontSize: "0.72rem", maxWidth: 80 }}>
                            {s.subject?.name || `Subj ${i + 1}`}
                          </th>
                        ))}
                        <th style={{ textAlign: "center" }}>Average</th>
                        <th style={{ textAlign: "center" }}>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentStats.map((s, i) => {
                        const sid = s.student?.id || Number(Object.keys(studentMap)[i]);
                        const stuResults = results.filter(r => r.student_id === sid);
                        return (
                          <tr key={i}>
                            <td className="font-medium t-text-primary" style={{ whiteSpace: "nowrap" }}>
                              {s.student ? `${s.student.first_name} ${s.student.last_name}` : `Student #${sid}`}
                            </td>
                            <td className="t-text-secondary" style={{ fontSize: "0.75rem" }}>
                              {s.student?.admission_number || "—"}
                            </td>
                            {subjectStats.map((sub, j) => {
                              const subId = Number(Object.keys(subjectMap)[j]);
                              const r = stuResults.find(r => r.subject_id === subId);
                              return (
                                <td key={j} style={{ textAlign: "center" }}>
                                  {r ? (
                                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: Number(r.total_score) >= 40 ? "inherit" : "#ef4444" }}>
                                      {Number(r.total_score).toFixed(0)}
                                    </span>
                                  ) : (
                                    <span className="t-text-secondary">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: "center", fontWeight: 700, color: s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#f59e0b" : "#ef4444" }}>
                              {s.avg.toFixed(1)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="badge-blue" style={{ fontSize: "0.72rem" }}>
                                {s.position || `#${i + 1}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
