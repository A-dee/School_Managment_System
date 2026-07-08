"use client";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { getRole } from "@/lib/auth";
import { Save, CheckCircle, Users, FileText, Download, ArrowLeft, Search, BookOpen, ShieldCheck, ShieldX } from "lucide-react";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
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

type StudentRow = { id: number; first_name: string; last_name: string; admission_number: string };
type Subject    = { id: number; name: string };
type Result     = { id: number; student_id: number; subject_id: number; ca_score: string; exam_score: string; total_score: string; grade: string | null };
type Meta = Partial<{
  times_school_opened: number; times_present: number; times_late: number;
  interest_curiosity: string; level_of_attention: string; interrelation_peers: string;
  personal_cleanliness: string; self_confidence: string; expression_ability: string;
  indoor_outdoor_play: string; environment_awareness: string;
  class_teacher_comment: string; head_teacher_comment: string; next_term_begins: string;
  approved: boolean; approved_at: string | null;
}>;

function formatDisplayDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
function PrintCard({ student, className, sessionName, termName, results, subjectMap, meta }: {
  student: StudentRow; className: string; sessionName: string; termName: string;
  results: Result[]; subjectMap: Record<number, string>; meta: Meta;
}) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#000" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 6, background: "linear-gradient(90deg,#e8314e,#f5a623,#27ae60,#2980b9)", borderRadius: "3px 3px 0 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px 8px", border: "2px solid #e0e0e0", borderTop: "none", borderBottom: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "6px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src="/lenage-logo.png" alt="Lenage Management Systems Logo" style={{ height: 44, width: "auto", objectFit: "contain" }} />
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

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, border: "1px solid #000" }}>
        <tbody>
          <tr>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000", width: "40%" }}><b>NAME:</b> {student.first_name} {student.last_name}</td>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}><b>CLASS:</b> {className}</td>
            <td style={{ padding: "3px 6px" }}><b>ADM. NO:</b> {student.admission_number}</td>
          </tr>
          <tr style={{ borderTop: "1px solid #000" }}>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}><b>TERM:</b> {termName}</td>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}><b>SESSION:</b> {sessionName}</td>
            <td style={{ padding: "3px 6px" }}></td>
          </tr>
        </tbody>
      </table>

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
          {results.map((r, i) => (
            <tr key={r.id} style={{ background: i % 2 === 0 ? "#f5f5f5" : "#fff" }}>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{subjectMap[r.subject_id] ?? `Subject ${r.subject_id}`}</td>
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

      <div style={{ fontSize: 9, marginBottom: 8, padding: "3px 6px", border: "1px solid #ccc", display: "inline-block" }}>
        <b>KEY:</b>&nbsp; A = 70–100 &nbsp;|&nbsp; B = 60–69 &nbsp;|&nbsp; C = 50–59 &nbsp;|&nbsp; D = 40–49 &nbsp;|&nbsp; F = 0–39
      </div>

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
              const rating = (meta as Record<string, string | undefined>)[key];
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
            {([["Times Opened", meta.times_school_opened], ["Times Present", meta.times_present], ["Times Late", meta.times_late]] as [string, number | undefined][]).map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{lbl}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", minWidth: 36, fontWeight: 700 }}>{val ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "4px 6px", width: "50%", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Class Teacher&apos;s Comment:</div>
              <div style={{ minHeight: 36 }}>{meta.class_teacher_comment ?? ""}</div>
            </td>
            <td style={{ border: "1px solid #ccc", padding: "4px 6px", verticalAlign: "top" }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Head Teacher&apos;s Comment:</div>
              <div style={{ minHeight: 36 }}>{meta.head_teacher_comment ?? ""}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #000", width: 140, paddingTop: 3, fontSize: 9 }}>Class Teacher&apos;s Signature</div>
        </div>
        <div>
          <b>Next Term Begins:</b>{" "}
          <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: 100, paddingBottom: 1 }}>{formatDisplayDate(meta.next_term_begins)}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #000", width: 140, paddingTop: 3, fontSize: 9 }}>Head Teacher&apos;s Signature</div>
        </div>
      </div>
      <div style={{ marginTop: 14, borderTop: "1px solid #e0e0e0", paddingTop: 5, textAlign: "center", fontSize: 8, color: "#999" }}>
        Hope Hills Academy · Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, 901101, FCT · Tel: 08065598994 / 07052677702
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function EditPanel({ meta, setMeta }: { meta: Meta; setMeta: React.Dispatch<React.SetStateAction<Meta>> }) {
  const inp: React.CSSProperties = { width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-primary)", fontSize: "0.8125rem" };
  const numField = (label: string, key: keyof Meta) => (
    <div>
      <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>{label}</p>
      <input type="number" min={0} value={(meta[key] as number | undefined) ?? ""}
        onChange={e => setMeta(m => ({ ...m, [key]: e.target.value === "" ? undefined : parseInt(e.target.value) }))}
        style={inp} />
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section>
        <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Attendance</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {numField("Times School Opened", "times_school_opened")}
          {numField("Times Present", "times_present")}
          {numField("Times Late", "times_late")}
        </div>
      </section>
      <section>
        <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Personal Qualities</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {PERSONAL_QUALITIES.map(({ key, label }) => {
            const current = (meta as Record<string, string | undefined>)[key];
            return (
              <div key={key}>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>{label}</p>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["A", "B", "C", "D"] as const).map(r => {
                    const active = current === r;
                    return (
                      <button key={r} onClick={() => setMeta(m => ({ ...m, [key]: active ? undefined : r }))}
                        style={{ width: 34, height: 32, borderRadius: 6, fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                          background: active ? "var(--accent)" : "transparent",
                          color: active ? "var(--btn-primary-text)" : "var(--text-primary)" }}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Comments</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {(["class_teacher_comment", "head_teacher_comment"] as const).map(key => (
            <div key={key}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>
                {key === "class_teacher_comment" ? "Class Teacher's Comment" : "Head Teacher's Comment"}
              </p>
              <textarea rows={3} value={(meta[key] as string | undefined) ?? ""}
                onChange={e => setMeta(m => ({ ...m, [key]: e.target.value }))}
                style={{ ...inp, resize: "vertical" }} />
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Administrative</h3>
        <div style={{ maxWidth: 320 }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>Next Term Begins</p>
          <input type="date"
            value={(meta.next_term_begins as string | undefined) ?? ""}
            onChange={e => setMeta(m => ({ ...m, next_term_begins: e.target.value }))}
            style={inp} />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function ReportCardsPage() {
  const [classes,  setClasses]  = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId,   setClassId]   = useState("");
  const [sessionId, setSessionId] = useState("");
  const [termId,    setTermId]    = useState("");

  const [students,    setStudents]    = useState<StudentRow[]>([]);
  const [allResults,  setAllResults]  = useState<Result[]>([]);
  const [selected,    setSelected]    = useState<StudentRow | null>(null);
  const [meta,        setMeta]        = useState<Meta>({});
  const [approving,   setApproving]   = useState(false);

  const [subjSearch, setSubjSearch]   = useState("");
  const [stuSearch,  setStuSearch]    = useState("");
  const [selSubject, setSelSubject]   = useState<number | null>(null);

  const [tab,        setTab]       = useState<"edit" | "preview">("edit");
  const [saving,     setSaving]    = useState(false);
  const [saved,      setSaved]     = useState(false);
  const [loading,    setLoading]   = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const isProprietor = getRole() === "SUPER_ADMIN";

  useEffect(() => {
    Promise.allSettled([
      api.get("/api/v1/classes/?limit=200"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/subjects/"),
    ]).then(([c, s, sub]) => {
      if (c.status   === "fulfilled") setClasses(c.value.data.data   || []);
      if (s.status   === "fulfilled") setSessions(s.value.data.data  || []);
      if (sub.status === "fulfilled") setSubjects(sub.value.data.data || []);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) { setTerms([]); setTermId(""); return; }
    api.get(`/api/v1/academic/terms?session_id=${sessionId}`)
      .then(r => setTerms(r.data.data || []))
      .catch(() => {});
  }, [sessionId]);

  const load = async () => {
    if (!classId || !sessionId || !termId) return;
    setLoading(true);
    setSelected(null); setAllResults([]); setSelSubject(null);
    try {
      const [stuRes, resRes] = await Promise.all([
        api.get(`/api/v1/students?class_id=${classId}&limit=200`),
        api.get(`/api/v1/results/class/${classId}`, { params: { term_id: Number(termId), session_id: Number(sessionId) } }),
      ]);
      setStudents(stuRes.data.data || []);
      setAllResults(resRes.data.data || []);
    } catch (e: any) {
      setStudents([]);
      setAllResults([]);
    }
    setLoading(false);
  };

  const selectStudent = async (student: StudentRow) => {
    setSelected(student);
    setTab("edit");
    setMeta({});
    try {
      const metaRes = await api.get(`/api/v1/report-cards/${student.id}`, {
        params: { term_id: Number(termId), session_id: Number(sessionId) },
      });
      setMeta(metaRes.data.data ?? {});
    } catch { /* no meta yet, that's fine */ }
  };

  const saveMeta = async () => {
    if (!selected || !sessionId || !termId) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/report-cards/${selected.id}`, {
        term_id: parseInt(termId), session_id: parseInt(sessionId), ...meta,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* silent */ }
    setSaving(false);
  };

  const approveCard = async (approve: boolean) => {
    if (!selected || !sessionId || !termId) return;
    setApproving(true);
    try {
      const endpoint = approve ? "approve" : "unapprove";
      await api.post(`/api/v1/report-cards/${selected.id}/${endpoint}`, null, {
        params: { term_id: parseInt(termId), session_id: parseInt(sessionId) },
      });
      setMeta(m => ({ ...m, approved: approve, approved_at: approve ? new Date().toISOString() : null }));
      toast.success(approve ? "Report card approved" : "Approval revoked");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setApproving(false);
  };

  const approveAll = async () => {
    if (!classId || !sessionId || !termId) return;
    setApproving(true);
    try {
      const r = await api.post(`/api/v1/report-cards/class/${classId}/approve-all`, null, {
        params: { term_id: parseInt(termId), session_id: parseInt(sessionId) },
      });
      toast.success(r.data.message || "All report cards approved");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setApproving(false);
  };

  const handlePrint = () => {
    if (!selected || !printRef.current) return;
    const content    = printRef.current.innerHTML;
    const logoUrl    = `${window.location.origin}/lenage-logo.png`;
    const letterhead = buildLetterheadHTML(logoUrl);
    const win = window.open("", "_blank", "width=860,height=1100");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Report Card – ${selected.first_name} ${selected.last_name}</title>
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

  /* ── derived ── */
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const selClass   = classes.find(c  => c.id === parseInt(classId));
  const selSession = sessions.find(s => s.id === parseInt(sessionId));
  const selTerm    = terms.find(t    => t.id === parseInt(termId));

  /* subjects that have at least one result in this class/term */
  const activeSubjectIds = [...new Set(allResults.map(r => r.subject_id))];
  const activeSubjects   = activeSubjectIds
    .map(id => subjects.find(s => s.id === id))
    .filter(Boolean) as Subject[];

  /* student results count per subject */
  const resultsBySubject = (subjId: number) => allResults.filter(r => r.subject_id === subjId);
  /* student ids that have a result for the selected subject */
  const studentsWithSubject = selSubject
    ? new Set(allResults.filter(r => r.subject_id === selSubject).map(r => r.student_id))
    : null;

  const filteredSubjects = activeSubjects.filter(s =>
    s.name.toLowerCase().includes(subjSearch.toLowerCase())
  );
  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(stuSearch.toLowerCase()) &&
    (studentsWithSubject ? studentsWithSubject.has(s.id) : true)
  );

  const studentResults = selected
    ? allResults.filter(r => r.student_id === selected.id)
    : [];

  const printCardProps = {
    student:     selected!,
    className:   selClass?.name ?? "",
    sessionName: selSession?.name ?? "",
    termName:    selTerm?.name ?? "",
    results:     studentResults,
    subjectMap,
    meta,
  };

  const loaded = students.length > 0 || allResults.length > 0;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>

        {/* ── Filter bar ── */}
        <div className="t-card" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>Class *</p>
              <select className="t-input" style={{ minWidth: 150 }}
                value={classId} onChange={e => { setClassId(e.target.value); setStudents([]); setAllResults([]); setSelected(null); }}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>Session *</p>
              <select className="t-input" style={{ minWidth: 150 }}
                value={sessionId} onChange={e => { setSessionId(e.target.value); setSelected(null); }}>
                <option value="">Select session…</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>Term *</p>
              <select className="t-input" style={{ minWidth: 130 }}
                value={termId} onChange={e => { setTermId(e.target.value); setSelected(null); }} disabled={!sessionId}>
                <option value="">Select term…</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button
              className="t-btn-primary"
              onClick={load}
              disabled={!classId || !sessionId || !termId || loading}
              style={{ alignSelf: "flex-end" }}
            >
              {loading ? "Loading…" : "Load"}
            </button>
            {isProprietor && loaded && (
              <button
                onClick={approveAll}
                disabled={approving}
                style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", opacity: approving ? 0.7 : 1 }}
              >
                <ShieldCheck size={15} /> {approving ? "Approving…" : "Approve All"}
              </button>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {!loaded && !loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--text-secondary)", padding: "60px 0" }}>
            <FileText size={42} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: "0.875rem" }}>Select class, session and term, then click Load</p>
          </div>
        )}

        {/* ── Main 3-column layout ── */}
        {loaded && (
          <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 500, overflow: "hidden" }}>

            {/* ── LEFT: Subjects panel ── */}
            <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {/* header */}
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)", marginBottom: 8 }}>
                  Subjects <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "var(--text-secondary)" }}>({activeSubjects.length})</span>
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input className="t-input" style={{ paddingLeft: 26, fontSize: "0.75rem", padding: "5px 8px 5px 26px" }}
                    placeholder="Filter subjects…" value={subjSearch} onChange={e => setSubjSearch(e.target.value)} />
                </div>
              </div>
              {/* "All" chip */}
              <div style={{ padding: "6px 8px 4px", flexShrink: 0 }}>
                <button
                  onClick={() => setSelSubject(null)}
                  style={{ width: "100%", textAlign: "left", padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                    background: selSubject === null ? "var(--accent)" : "transparent",
                    color: selSubject === null ? "var(--btn-primary-text)" : "var(--text-secondary)" }}
                >
                  All Students
                </button>
              </div>
              {/* subject list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
                {filteredSubjects.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "12px 8px", textAlign: "center" }}>
                    {activeSubjects.length === 0 ? "No results recorded yet" : "No match"}
                  </p>
                ) : filteredSubjects.map(s => {
                  const cnt = resultsBySubject(s.id).length;
                  const active = selSubject === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelSubject(active ? null : s.id)}
                      style={{ width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                        marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                        background: active ? "var(--accent)" : "var(--bg-main)",
                        color: active ? "var(--btn-primary-text)" : "var(--text-primary)" }}
                    >
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: "0.68rem", opacity: 0.75, flexShrink: 0 }}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── MIDDLE: Students panel ── */}
            <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)", marginBottom: 8 }}>
                  Students <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "var(--text-secondary)" }}>({filteredStudents.length})</span>
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input className="t-input" style={{ paddingLeft: 26, fontSize: "0.75rem", padding: "5px 8px 5px 26px" }}
                    placeholder="Search student…" value={stuSearch} onChange={e => setStuSearch(e.target.value)} />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                    <Users size={28} style={{ opacity: 0.2, display: "block", margin: "0 auto 6px" }} />
                    {students.length === 0 ? "No students in this class" : "No match"}
                  </div>
                ) : filteredStudents.map(s => {
                  const hasResults = allResults.some(r => r.student_id === s.id);
                  const isSelected = selected?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectStudent(s)}
                      style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                        marginBottom: 3, display: "flex", flexDirection: "column", gap: 2,
                        background: isSelected ? "var(--accent)" : "var(--bg-main)",
                        color: isSelected ? "var(--btn-primary-text)" : "var(--text-primary)" }}
                    >
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{s.first_name} {s.last_name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.68rem", opacity: 0.65 }}>{s.admission_number}</span>
                        {hasResults && (
                          <span style={{ fontSize: "0.6rem", padding: "1px 5px", borderRadius: 4,
                            background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(34,197,94,0.15)",
                            color: isSelected ? "#fff" : "#16a34a", fontWeight: 700 }}>
                            Results
                          </span>
                        )}
                        {selected?.id === s.id && meta.approved && (
                          <span style={{ fontSize: "0.6rem", padding: "1px 5px", borderRadius: 4,
                            background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(34,197,94,0.15)",
                            color: isSelected ? "#fff" : "#16a34a", fontWeight: 700 }}>
                            Approved
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── RIGHT: Report card editor / preview ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", minWidth: 0 }}>
              {!selected ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--text-secondary)" }}>
                  <BookOpen size={40} style={{ opacity: 0.2 }} />
                  <p style={{ fontSize: "0.875rem" }}>Select a student to view their report card</p>
                </div>
              ) : (
                <>
                  {/* Tab bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setSelected(null)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-secondary)" }}
                    >
                      <ArrowLeft size={12} /> Back
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                        {selected.first_name} {selected.last_name}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: 8 }}>{selected.admission_number}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["edit", "preview"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500,
                          background: tab === t ? "var(--accent)" : "var(--accent-light)", color: tab === t ? "var(--btn-primary-text)" : "var(--accent)" }}>
                          {t === "edit" ? "Edit" : "Preview"}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {/* Approval status badge */}
                      {meta.approved ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#16a34a", fontWeight: 700 }}>
                          <ShieldCheck size={13} /> Approved
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700 }}>
                          <ShieldX size={13} /> Pending Approval
                        </span>
                      )}

                      {saved && <span style={{ fontSize: "0.75rem", color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={13} /> Saved</span>}

                      {/* Save — not for proprietor (they approve, not edit) */}
                      {!isProprietor && (
                        <button onClick={saveMeta} disabled={saving}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
                          <Save size={13} />{saving ? "Saving…" : "Save"}
                        </button>
                      )}

                      {/* Approve / Revoke — proprietor only */}
                      {isProprietor && (
                        meta.approved ? (
                          <button onClick={() => approveCard(false)} disabled={approving}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
                            <ShieldX size={13} />{approving ? "…" : "Revoke"}
                          </button>
                        ) : (
                          <button onClick={() => approveCard(true)} disabled={approving}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
                            <ShieldCheck size={13} />{approving ? "…" : "Approve"}
                          </button>
                        )
                      )}

                      <button
                        onClick={handlePrint}
                        disabled={!meta.approved && !isProprietor}
                        title={!meta.approved ? "Awaiting proprietor approval" : ""}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--accent-light)", color: "var(--accent)", cursor: meta.approved || isProprietor ? "pointer" : "not-allowed", fontSize: "0.8rem", fontWeight: 600, opacity: !meta.approved && !isProprietor ? 0.45 : 1 }}>
                        <Download size={13} />PDF
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                    {tab === "edit" ? (
                      <EditPanel meta={meta} setMeta={setMeta} />
                    ) : (
                      <div ref={printRef} style={{ background: "#fff", borderRadius: 6, padding: 20, border: "1px solid #ddd" }}>
                        <PrintCard {...printCardProps} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden print ref when on edit tab */}
      {selected && tab === "edit" && (
        <div style={{ display: "none" }} ref={printRef}>
          <PrintCard {...printCardProps} />
        </div>
      )}
    </DashboardLayout>
  );
}
