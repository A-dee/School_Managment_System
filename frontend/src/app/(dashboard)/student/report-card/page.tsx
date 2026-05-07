"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { FileText, ShieldCheck, Lock } from "lucide-react";

const PERSONAL_QUALITIES = [
  { key: "interest_curiosity",    label: "Interest & Curiosity" },
  { key: "level_of_attention",    label: "Level of Attention" },
  { key: "interrelation_peers",   label: "Interrelation with Peers" },
  { key: "personal_cleanliness",  label: "Personal Cleanliness" },
  { key: "self_confidence",       label: "Self Confidence" },
  { key: "expression_ability",    label: "Expression Ability" },
  { key: "indoor_outdoor_play",   label: "Indoor / Outdoor Play" },
  { key: "environment_awareness", label: "Environment Awareness" },
] as const;

const gradeColor = (g: string) =>
  ({ A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", F: "#dc2626" }[g] || "#64748b");

export default function StudentReportCardPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [filter,   setFilter]   = useState({ session_id: "", term_id: "" });
  const [card,     setCard]     = useState<any>(null);
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
    ]).then(([s, t]) => {
      const sessionList = s.status === "fulfilled" ? s.value.data.data || [] : [];
      const termList    = t.status === "fulfilled" ? t.value.data.data || [] : [];
      setSessions(sessionList);
      setTerms(termList);
      const curSession = sessionList.find((x: any) => x.is_current);
      const curTerm    = termList.find((x: any) => x.is_current);
      setFilter({
        session_id: curSession ? String(curSession.id) : "",
        term_id:    curTerm    ? String(curTerm.id)    : "",
      });
    });
  }, []);

  const load = async () => {
    if (!filter.session_id || !filter.term_id) { toast.error("Select session and term"); return; }
    setLoading(true);
    setLoaded(false);
    try {
      const [cardRes, resRes] = await Promise.allSettled([
        api.get(`/api/v1/report-cards/my/${filter.term_id}/${filter.session_id}`),
        api.get("/api/v1/results/my", { params: { session_id: filter.session_id, term_id: filter.term_id } }),
      ]);
      setCard(cardRes.status === "fulfilled" ? cardRes.value.data.data : null);
      setResults(resRes.status === "fulfilled" ? resRes.value.data.data || [] : []);
      setLoaded(true);
    } catch { toast.error("Failed to load report card"); }
    setLoading(false);
  };

  const avg = results.length > 0 ? results.reduce((s, r) => s + Number(r.total_score), 0) / results.length : 0;
  const position = results[0]?.class_position ?? null;

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">My Report Card</h1>
          <p className="t-page-subtitle">View your term report card once approved by the Proprietor</p>
        </div>
      </div>

      {/* Filter */}
      <div className="t-card mb-5" style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="t-label">Session</label>
            <select className="t-input" style={{ width: 160 }} value={filter.session_id}
              onChange={e => setFilter(p => ({ ...p, session_id: e.target.value }))}>
              <option value="">Select session</option>
              {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Term</label>
            <select className="t-input" style={{ width: 160 }} value={filter.term_id}
              onChange={e => setFilter(p => ({ ...p, term_id: e.target.value }))}>
              <option value="">Select term</option>
              {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button className="t-btn-primary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "View Report Card"}
          </button>
        </div>
      </div>

      {/* Not yet approved */}
      {loaded && !card && (
        <div className="t-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Lock size={44} style={{ opacity: 0.18, display: "block", margin: "0 auto 14px", color: "var(--text-secondary)" }} />
          <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 6 }}>
            Report Card Not Yet Available
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            Your report card for this term is awaiting approval by the Proprietor. Please check back later.
          </p>
        </div>
      )}

      {/* Approved card */}
      {loaded && card && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Approved banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <ShieldCheck size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "#16a34a" }}>Approved by Proprietor</p>
              {card.approved_at && (
                <p style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {new Date(card.approved_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Subjects", value: results.length },
              { label: "Average Score", value: avg.toFixed(1) },
              { label: "Class Position", value: position ? `#${position}` : "—" },
            ].map(s => (
              <div key={s.label} className="t-card" style={{ padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--accent)", marginTop: 4 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Scores table */}
          {results.length > 0 && (
            <div className="t-card overflow-x-auto">
              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>Academic Results</p>
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th style={{ textAlign: "center" }}>CA (/40)</th>
                    <th style={{ textAlign: "center" }}>Exam (/60)</th>
                    <th style={{ textAlign: "center" }}>Total</th>
                    <th style={{ textAlign: "center" }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.subject_name || `Subject #${r.subject_id}`}</td>
                      <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{r.ca_score}</td>
                      <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{r.exam_score}</td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{r.total_score}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 6, background: `${gradeColor(r.grade)}15`, color: gradeColor(r.grade), fontWeight: 800, fontSize: "0.8125rem" }}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Attendance + Personal Qualities */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Attendance */}
            <div className="t-card">
              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>Attendance</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Times School Opened", card.times_school_opened],
                  ["Times Present",       card.times_present],
                  ["Times Late",          card.times_late],
                ].map(([lbl, val]) => (
                  <div key={lbl as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 8, background: "var(--bg-main)" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{lbl}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>{val ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal Qualities */}
            <div className="t-card">
              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>Personal Qualities</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {PERSONAL_QUALITIES.map(({ key, label }) => {
                  const rating = card[key];
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderRadius: 7, background: "var(--bg-main)" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{label}</span>
                      <span style={{ fontWeight: 800, fontSize: "0.8125rem", color: rating ? "var(--accent)" : "var(--text-secondary)" }}>{rating || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comments */}
          {(card.class_teacher_comment || card.head_teacher_comment) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Class Teacher's Comment", key: "class_teacher_comment" },
                { label: "Head Teacher's Comment",  key: "head_teacher_comment" },
              ].map(({ label, key }) => card[key] && (
                <div key={key} className="t-card">
                  <p style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 8 }}>{label}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.7 }}>{card[key]}</p>
                </div>
              ))}
            </div>
          )}

          {/* Next term */}
          {card.next_term_begins && (
            <div className="t-card" style={{ padding: "12px 18px" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Next Term Begins</p>
              <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", marginTop: 3 }}>{card.next_term_begins}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state (before load) */}
      {!loaded && !loading && (
        <div className="t-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <FileText size={44} style={{ opacity: 0.15, display: "block", margin: "0 auto 14px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Select session and term then click View Report Card.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
