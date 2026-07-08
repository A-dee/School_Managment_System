"use client";
import { useRef, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { FileText, ShieldCheck, Lock, Download } from "lucide-react";

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

function formatDisplayDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Print template helpers ──────────────────────────────────────────── */

function buildLetterheadHTML(logoUrl: string) {
  return `
    <div style="margin-bottom:12px;">
      <div style="height:6px;background:linear-gradient(90deg,#e8314e,#f5a623,#27ae60,#2980b9);border-radius:3px 3px 0 0;"></div>
      <div style="display:flex;align-items:center;gap:16px;padding:10px 14px 8px;border:2px solid #e0e0e0;border-top:none;border-bottom:none;">
        <img src="${logoUrl}" alt="Lenage Management Systems Logo" style="width:80px;height:80px;object-fit:contain;flex-shrink:0;" />
        <div style="flex:1;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:#1a1a2e;letter-spacing:0.5px;line-height:1.1;">LENAGE MANAGEMENT SYSTEMS</div>
          <div style="font-size:10px;color:#555;margin-top:3px;letter-spacing:0.5px;">Enterprise School Administration</div>
          <div style="font-size:9.5px;color:#777;margin-top:4px;">Enterprise School Administration & Management</div>
          <div style="font-size:8.5px;color:#888;margin-top:3px;">📍 Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, FCT &nbsp;&bull;&nbsp; 📞 08065598994 / 07052677702 &nbsp;&bull;&nbsp; ✉ info@lenagetechnologies.com</div>
        </div>
        <div style="width:80px;text-align:center;flex-shrink:0;">
          <div style="width:74px;height:74px;border:2px dashed #ccc;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;">
            <span style="font-size:7.5px;color:#bbb;text-align:center;line-height:1.3;">SCHOOL<br>STAMP</span>
          </div>
        </div>
      </div>
      <div style="background:#1a1a2e;color:#fff;text-align:center;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:1.5px;border-bottom:3px solid #e8314e;">
        CONTINUOUS ASSESSMENT REPORT CARD
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#2980b9,#27ae60,#f5a623,#e8314e);"></div>
    </div>
  `;
}

function PrintTemplate({ card, results }: { card: any; results: any[] }) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#000" }}>
      {/* Letterhead */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 6, background: "linear-gradient(90deg,#e8314e,#f5a623,#27ae60,#2980b9)", borderRadius: "3px 3px 0 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px 8px", border: "2px solid #e0e0e0", borderTop: "none", borderBottom: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "6px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src="/lenage-logo.png" alt="Lenage Management Systems" style={{ height: 44, width: "auto", objectFit: "contain" }} />
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", letterSpacing: 0.5, lineHeight: 1.1 }}>LENAGE MANAGEMENT SYSTEMS</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 3, letterSpacing: 0.5 }}>Enterprise School Administration</div>
            <div style={{ fontSize: 9.5, color: "#777", marginTop: 4 }}>Enterprise School Administration & Management</div>
            <div style={{ fontSize: 8.5, color: "#888", marginTop: 3 }}>📍 Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, FCT &nbsp;&bull;&nbsp; 📞 08065598994 / 07052677702 &nbsp;&bull;&nbsp; ✉ info@lenagetechnologies.com</div>
          </div>
          <div style={{ width: 80, textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 74, height: 74, border: "2px dashed #ccc", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <span style={{ fontSize: 7.5, color: "#bbb", textAlign: "center", lineHeight: 1.3 }}>SCHOOL<br />STAMP</span>
            </div>
          </div>
        </div>
        <div style={{ background: "#1a1a2e", color: "#fff", textAlign: "center", padding: "5px 12px", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, borderBottom: "3px solid #e8314e" }}>CONTINUOUS ASSESSMENT REPORT CARD</div>
        <div style={{ height: 4, background: "linear-gradient(90deg,#2980b9,#27ae60,#f5a623,#e8314e)" }} />
      </div>

      {/* Student info table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, border: "1px solid #000" }}>
        <tbody>
          <tr>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000", width: "40%" }}><b>NAME:</b> {card.student_name}</td>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}><b>CLASS:</b> {card.class_name}</td>
            <td style={{ padding: "3px 6px" }}><b>ADM. NO:</b> {card.admission_number}</td>
          </tr>
          <tr style={{ borderTop: "1px solid #000" }}>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}><b>TERM:</b> {card.term_name}</td>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}><b>SESSION:</b> {card.session_name}</td>
            <td style={{ padding: "3px 6px" }}></td>
          </tr>
        </tbody>
      </table>

      {/* Results table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
        <thead>
          <tr style={{ background: "#1a1a2e", color: "#fff" }}>
            <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "left" }}>SUBJECT</th>
            <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", width: 55 }}>CA (40)</th>
            <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", width: 55 }}>EXAM (60)</th>
            <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", width: 65 }}>TOTAL (100)</th>
            <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", width: 45 }}>GRADE</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r: any, i: number) => (
            <tr key={r.id} style={{ background: i % 2 === 0 ? "#f5f5f5" : "#fff" }}>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{r.subject_name || `Subject ${r.subject_id}`}</td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{parseFloat(r.ca_score).toFixed(1)}</td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{parseFloat(r.exam_score).toFixed(1)}</td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 600 }}>{parseFloat(r.total_score).toFixed(1)}</td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 700, color: r.grade === "A" ? "#16a34a" : r.grade === "F" ? "#dc2626" : "#000" }}>{r.grade ?? "–"}</td>
            </tr>
          ))}
          {results.length === 0 && (
            <tr><td colSpan={5} style={{ border: "1px solid #ccc", padding: 8, textAlign: "center", color: "#888" }}>No results recorded for this term</td></tr>
          )}
        </tbody>
      </table>

      {/* Grade key */}
      <div style={{ fontSize: 9, marginBottom: 8, padding: "3px 6px", border: "1px solid #ccc", display: "inline-block" }}>
        <b>KEY:</b>&nbsp; A = 70–100 &nbsp;|&nbsp; B = 60–69 &nbsp;|&nbsp; C = 50–59 &nbsp;|&nbsp; D = 40–49 &nbsp;|&nbsp; F = 0–39
      </div>

      {/* Personal Qualities + Attendance side by side */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <table style={{ flex: 2, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a2e", color: "#fff" }}>
              <th style={{ border: "1px solid #333", padding: "3px 6px", textAlign: "left" }}>PERSONAL QUALITIES</th>
              {["A", "B", "C", "D"].map(r => <th key={r} style={{ border: "1px solid #333", padding: "3px 6px", textAlign: "center", width: 22 }}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERSONAL_QUALITIES.map(({ key, label }, i) => {
              const rating = card[key];
              return (
                <tr key={key} style={{ background: i % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                  <td style={{ border: "1px solid #ccc", padding: "2px 6px" }}>{label}</td>
                  {["A", "B", "C", "D"].map(r => (
                    <td key={r} style={{ border: "1px solid #ccc", padding: "2px 6px", textAlign: "center", color: "#16a34a", fontWeight: 700 }}>
                      {rating === r ? "✓" : ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <table style={{ flex: 1, borderCollapse: "collapse", alignSelf: "flex-start" }}>
          <thead>
            <tr style={{ background: "#1a1a2e", color: "#fff" }}>
              <th colSpan={2} style={{ border: "1px solid #333", padding: "3px 6px", textAlign: "center" }}>ATTENDANCE</th>
            </tr>
          </thead>
          <tbody>
            {([["Times Opened", card.times_school_opened], ["Times Present", card.times_present], ["Times Late", card.times_late]] as [string, number | undefined][]).map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{lbl}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", minWidth: 36, fontWeight: 700 }}>{val ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comments */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "4px 6px", width: "50%", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Class Teacher&apos;s Comment:</div>
              <div style={{ minHeight: 36 }}>{card.class_teacher_comment ?? ""}</div>
            </td>
            <td style={{ border: "1px solid #ccc", padding: "4px 6px", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Head Teacher&apos;s Comment:</div>
              <div style={{ minHeight: 36 }}>{card.head_teacher_comment ?? ""}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures + Next term */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 8 }}>
        <div>
          <b>Next Term Begins:</b>{" "}
          <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: 100, paddingBottom: 1 }}>{formatDisplayDate(card.next_term_begins)}</span>
        </div>
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid #e0e0e0", paddingTop: 5, textAlign: "center", fontSize: 8, color: "#999" }}>
        Hope Hills Academy · Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, 901101, FCT · Tel: 08065598994 / 07052677702
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */

export default function StudentReportCardPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [filter,   setFilter]   = useState({ session_id: "", term_id: "" });
  const [card,     setCard]     = useState<any>(null);
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    if (!card || !printRef.current) return;
    const content    = printRef.current.innerHTML;
    const logoUrl    = `${window.location.origin}/lenage-logo.png`;
    const letterhead = buildLetterheadHTML(logoUrl);
    const win = window.open("", "_blank", "width=860,height=1100");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Report Card – ${card.student_name}</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 14mm 12mm; }
        table { width: 100%; border-collapse: collapse; }
        @page { size: A4 portrait; margin: 8mm; }
        @media print { body { padding: 0; } .no-print { display: none !important; } }
        .print-btn { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 999; }
        .print-btn button { padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; font-family: Arial, sans-serif; }
        .btn-pdf { background: #e8314e; color: #fff; }
        .btn-close { background: #eee; color: #333; }
      </style>
      </head><body>
        <div class="print-btn no-print">
          <button class="btn-pdf" onclick="window.print()">⬇ Save as PDF / Print</button>
          <button class="btn-close" onclick="window.close()">✕ Close</button>
        </div>
        ${letterhead}${content}
      </body></html>`);
    win.document.close();
  };

  const avg      = results.length > 0 ? results.reduce((s, r) => s + Number(r.total_score), 0) / results.length : 0;
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

          {/* Approved banner + PDF button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <ShieldCheck size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "#16a34a" }}>Approved by Proprietor</p>
              {card.approved_at && (
                <p style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {new Date(card.approved_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={handlePrint}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "#e8314e", color: "#fff", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer" }}
            >
              <Download size={14} /> Download PDF
            </button>
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
              <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", marginTop: 3 }}>{formatDisplayDate(card.next_term_begins)}</p>
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

      {/* Hidden print template */}
      {card && (
        <div style={{ display: "none" }} ref={printRef}>
          <PrintTemplate card={card} results={results} />
        </div>
      )}
    </DashboardLayout>
  );
}
