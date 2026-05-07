"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getClasses } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CheckCircle, BookOpen, Send, Users } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-yellow", SUBMITTED: "badge-blue",
  APPROVED: "badge-green", PUBLISHED: "badge-green",
};

const gradeColor = (g: string) => ({
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", E: "#9333ea", F: "#dc2626",
}[g] || "#64748b");

export default function ResultsPage() {
  const [classes,  setClasses]  = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [results,  setResults]  = useState<any[]>([]);
  const [filter,   setFilter]   = useState({ class_id: "", term_id: "", session_id: "" });
  const [loading,  setLoading]  = useState(false);
  const [view,     setView]     = useState<"by-student" | "by-subject">("by-student");

  useEffect(() => {
    Promise.allSettled([
      getClasses({ limit: 100 }),
      api.get("/api/v1/academic/terms"),
      api.get("/api/v1/academic/sessions"),
    ]).then(([c, t, s]) => {
      if (c.status === "fulfilled") setClasses(c.value.data.data || []);
      if (t.status === "fulfilled") setTerms(t.value.data.data || []);
      if (s.status === "fulfilled") setSessions(s.value.data.data || []);
    });
  }, []);

  const load = async () => {
    if (!filter.class_id || !filter.term_id || !filter.session_id) {
      toast.error("Select class, term, and session"); return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/results/class/${filter.class_id}`, {
        params: { term_id: filter.term_id, session_id: filter.session_id },
      });
      setResults(res.data.data || []);
    } catch { toast.error("Failed to load results"); }
    setLoading(false);
  };

  const approve = async () => {
    if (!filter.class_id || !filter.term_id) return;
    try {
      await api.post("/api/v1/results/approve", null, {
        params: { class_id: filter.class_id, term_id: filter.term_id },
      });
      toast.success("Results approved"); load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to approve"); }
  };

  const publish = async () => {
    if (!filter.class_id || !filter.term_id || !filter.session_id) return;
    try {
      await api.post("/api/v1/results/compute-positions", null, {
        params: { class_id: filter.class_id, term_id: filter.term_id, session_id: filter.session_id },
      });
      await api.post("/api/v1/results/publish", null, {
        params: { class_id: filter.class_id, term_id: filter.term_id },
      });
      toast.success("Results published"); load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to publish"); }
  };

  // Group by student
  const byStudent = useMemo(() => {
    const map = new Map<number, { name: string; subjects: any[]; avg: number; position: number | null; status: string }>();
    for (const r of results) {
      if (!map.has(r.student_id)) {
        map.set(r.student_id, { name: r.student_name || `Student #${r.student_id}`, subjects: [], avg: 0, position: r.class_position, status: r.status });
      }
      map.get(r.student_id)!.subjects.push(r);
    }
    for (const [, val] of map) {
      val.avg = val.subjects.reduce((s, r) => s + Number(r.total_score), 0) / (val.subjects.length || 1);
      // position from first result (compute-positions sets all)
      val.position = val.subjects[0]?.class_position ?? null;
      // worst status wins (DRAFT < SUBMITTED < APPROVED < PUBLISHED)
      const order = ["DRAFT","SUBMITTED","APPROVED","PUBLISHED"];
      val.status = val.subjects.reduce((worst, r) => order.indexOf(r.status) < order.indexOf(worst) ? r.status : worst, "PUBLISHED");
    }
    return [...map.values()].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  }, [results]);

  // Summary counts
  const counts = useMemo(() => ({
    total: results.length,
    submitted: results.filter(r => r.status === "SUBMITTED").length,
    approved: results.filter(r => r.status === "APPROVED").length,
    published: results.filter(r => r.status === "PUBLISHED").length,
  }), [results]);

  const hasResults = results.length > 0;
  const selectedClass = classes.find(c => String(c.id) === filter.class_id);

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Results Management</h1>
          <p className="t-page-subtitle">Review, approve, and publish student results</p>
        </div>
      </div>

      {/* Filters */}
      <div className="t-card mb-5" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="t-label">Session *</label>
            <select className="t-input" style={{ width: 160 }} value={filter.session_id}
              onChange={e => { setFilter(p => ({ ...p, session_id: e.target.value })); setResults([]); }}>
              <option value="">Select session</option>
              {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Term *</label>
            <select className="t-input" style={{ width: 160 }} value={filter.term_id}
              onChange={e => { setFilter(p => ({ ...p, term_id: e.target.value })); setResults([]); }}>
              <option value="">Select term</option>
              {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Class *</label>
            <select className="t-input" style={{ width: 160 }} value={filter.class_id}
              onChange={e => { setFilter(p => ({ ...p, class_id: e.target.value })); setResults([]); }}>
              <option value="">Select class</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="t-btn-primary" onClick={load} disabled={loading} style={{ fontSize: "0.8125rem" }}>
            {loading ? "Loading…" : "Load Results"}
          </button>

          {hasResults && (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button
                onClick={approve}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 8, border: "1px solid #3b82f6", background: "rgba(59,130,246,0.08)", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
              >
                <CheckCircle size={14} /> Approve All
              </button>
              <button
                onClick={publish}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
              >
                <Send size={14} /> Publish All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {hasResults && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Total Results", value: counts.total, color: "#6366f1" },
            { label: "Submitted", value: counts.submitted, color: "#3b82f6" },
            { label: "Approved", value: counts.approved, color: "#f59e0b" },
            { label: "Published", value: counts.published, color: "#16a34a" },
          ].map(s => (
            <div key={s.label} className="t-card" style={{ padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* View toggle */}
      {hasResults && (
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {([["by-student", "By Student", Users], ["by-subject", "Flat List", BookOpen]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setView(key)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 16px",
              borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600,
              background: view === key ? "var(--accent)" : "var(--accent-light)",
              color: view === key ? "var(--btn-primary-text)" : "var(--accent)",
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
            {selectedClass?.name} · {byStudent.length} students
          </div>
        </div>
      )}

      {/* BY STUDENT view */}
      {hasResults && view === "by-student" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {byStudent.map((stu) => (
            <div key={stu.name} className="t-card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Student header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "var(--bg-main)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", flexShrink: 0 }}>
                    {stu.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{stu.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 1 }}>
                      {stu.subjects.length} subjects · Avg: <strong style={{ color: "var(--text-primary)" }}>{stu.avg.toFixed(1)}</strong>
                      {stu.position && <> · Position: <strong style={{ color: "var(--accent)" }}>#{stu.position}</strong></>}
                    </p>
                  </div>
                </div>
                <span className={STATUS_BADGE[stu.status] || "badge-yellow"} style={{ fontSize: "0.68rem" }}>{stu.status}</span>
              </div>
              {/* Subjects mini-table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Subject", "CA (/40)", "Exam (/60)", "Total", "Grade", "Status"].map(h => (
                        <th key={h} style={{ padding: "7px 14px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stu.subjects.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                        <td style={{ padding: "8px 14px", fontWeight: 600, color: "var(--text-primary)" }}>{r.subject_name || `Subject #${r.subject_id}`}</td>
                        <td style={{ padding: "8px 14px", color: "var(--text-secondary)" }}>{r.ca_score}</td>
                        <td style={{ padding: "8px 14px", color: "var(--text-secondary)" }}>{r.exam_score}</td>
                        <td style={{ padding: "8px 14px", fontWeight: 700, color: "var(--text-primary)" }}>{r.total_score}</td>
                        <td style={{ padding: "8px 14px" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 6, background: `${gradeColor(r.grade)}15`, color: gradeColor(r.grade), fontWeight: 800, fontSize: "0.8125rem" }}>
                            {r.grade}
                          </span>
                        </td>
                        <td style={{ padding: "8px 14px" }}>
                          <span className={STATUS_BADGE[r.status] || "badge-yellow"} style={{ fontSize: "0.65rem" }}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FLAT LIST view */}
      {hasResults && view === "by-subject" && (
        <div className="t-card overflow-x-auto">
          <table className="t-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject</th>
                <th style={{ textAlign: "center" }}>CA (/40)</th>
                <th style={{ textAlign: "center" }}>Exam (/60)</th>
                <th style={{ textAlign: "center" }}>Total</th>
                <th style={{ textAlign: "center" }}>Grade</th>
                <th style={{ textAlign: "center" }}>Position</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.student_name || `Student #${r.student_id}`}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{r.subject_name || `Subject #${r.subject_id}`}</td>
                  <td style={{ textAlign: "center" }}>{r.ca_score}</td>
                  <td style={{ textAlign: "center" }}>{r.exam_score}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{r.total_score}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 6, background: `${gradeColor(r.grade)}15`, color: gradeColor(r.grade), fontWeight: 800 }}>
                      {r.grade}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{r.class_position ?? "—"}</td>
                  <td><span className={STATUS_BADGE[r.status] || "badge-yellow"} style={{ fontSize: "0.68rem" }}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!hasResults && !loading && (
        <div className="t-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <BookOpen size={44} style={{ opacity: 0.15, display: "block", margin: "0 auto 14px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Select a session, term, and class then click Load Results.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
