"use client";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Printer, Save, CheckCircle, Users, FileText, Download } from "lucide-react";

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
type Result     = {
  id: number; subject_id: number;
  ca_score: string; exam_score: string; total_score: string; grade: string | null;
};
type Meta = Partial<{
  times_school_opened: number; times_present: number; times_late: number;
  interest_curiosity: string; level_of_attention: string; interrelation_peers: string;
  personal_cleanliness: string; self_confidence: string; expression_ability: string;
  indoor_outdoor_play: string; environment_awareness: string;
  class_teacher_comment: string; head_teacher_comment: string; next_term_begins: string;
}>;

/* ------------------------------------------------------------------ */
const sel: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem", minWidth: 150,
};
const inp: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--card-bg)",
  color: "var(--text-primary)", fontSize: "0.8125rem",
};
const btnP: React.CSSProperties = {
  padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
  background: "var(--accent)", color: "var(--btn-primary-text)", fontSize: "0.8125rem", fontWeight: 600,
};
const btnS: React.CSSProperties = {
  padding: "6px 16px", borderRadius: 8, cursor: "pointer",
  border: "1px solid var(--border)", background: "var(--accent-light)",
  color: "var(--accent)", fontSize: "0.8125rem", fontWeight: 600,
};

/* ------------------------------------------------------------------ */
/*  Letterhead HTML for print (string-based, injected into print win)   */
/* ------------------------------------------------------------------ */
function buildLetterheadHTML(logoUrl: string) {
  return `
    <div style="margin-bottom:12px;">
      <!-- Top stripe -->
      <div style="height:6px;background:linear-gradient(90deg,#e8314e,#f5a623,#27ae60,#2980b9);border-radius:3px 3px 0 0;margin-bottom:0;"></div>

      <!-- Header body -->
      <div style="display:flex;align-items:center;gap:16px;padding:10px 14px 8px;border:2px solid #e0e0e0;border-top:none;border-bottom:none;">
        <!-- Logo -->
        <img src="${logoUrl}" alt="Hope Hills Academy Logo"
          style="width:80px;height:80px;object-fit:contain;flex-shrink:0;" />

        <!-- School info centre -->
        <div style="flex:1;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:#1a1a2e;letter-spacing:0.5px;line-height:1.1;">
            HOPE HILLS ACADEMY
          </div>
          <div style="font-size:10px;color:#555;margin-top:3px;letter-spacing:0.5px;">
            Crèche &bull; Nursery &bull; Primary
          </div>
          <div style="font-size:9.5px;color:#777;margin-top:4px;">
            Excellence in Early Childhood Education
          </div>
          <div style="font-size:8.5px;color:#888;margin-top:3px;">
            📍 Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, FCT &nbsp;&bull;&nbsp; 📞 08065598994 / 07052677702 &nbsp;&bull;&nbsp; ✉ hopehillsacademy@gmail.com
          </div>
        </div>

        <!-- Right stamp space -->
        <div style="width:80px;text-align:center;flex-shrink:0;">
          <div style="width:74px;height:74px;border:2px dashed #ccc;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;">
            <span style="font-size:7.5px;color:#bbb;text-align:center;line-height:1.3;">SCHOOL<br>STAMP</span>
          </div>
        </div>
      </div>

      <!-- Title band -->
      <div style="background:#1a1a2e;color:#fff;text-align:center;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:1.5px;border-bottom:3px solid #e8314e;">
        CONTINUOUS ASSESSMENT REPORT CARD
      </div>

      <!-- Bottom stripe -->
      <div style="height:4px;background:linear-gradient(90deg,#2980b9,#27ae60,#f5a623,#e8314e);margin-bottom:0;"></div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  PrintCard  (in-app preview)                                         */
/* ------------------------------------------------------------------ */
function PrintCard({
  student, className, sessionName, termName, results, subjectMap, meta,
}: {
  student: StudentRow; className: string; sessionName: string; termName: string;
  results: Result[]; subjectMap: Record<number, string>; meta: Meta;
}) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#000" }}>

      {/* ── Letterhead ── */}
      <div style={{ marginBottom: 12 }}>
        {/* Top stripe */}
        <div style={{ height: 6, background: "linear-gradient(90deg,#e8314e,#f5a623,#27ae60,#2980b9)", borderRadius: "3px 3px 0 0" }} />

        {/* Header body */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px 8px", border: "2px solid #e0e0e0", borderTop: "none", borderBottom: "none" }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hope-hills-logo.png" alt="Hope Hills Academy Logo"
            style={{ width: 80, height: 80, objectFit: "contain", flexShrink: 0 }} />

          {/* Centre info */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", letterSpacing: 0.5, lineHeight: 1.1 }}>
              HOPE HILLS ACADEMY
            </div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 3, letterSpacing: 0.5 }}>
              Crèche &bull; Nursery &bull; Primary
            </div>
            <div style={{ fontSize: 9.5, color: "#777", marginTop: 4 }}>
              Excellence in Early Childhood Education
            </div>
            <div style={{ fontSize: 8.5, color: "#888", marginTop: 3 }}>
              📍 Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, FCT &nbsp;&bull;&nbsp; 📞 08065598994 / 07052677702 &nbsp;&bull;&nbsp; ✉ hopehillsacademy@gmail.com
            </div>
          </div>

          {/* Stamp */}
          <div style={{ width: 80, textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 74, height: 74, border: "2px dashed #ccc", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <span style={{ fontSize: 7.5, color: "#bbb", textAlign: "center", lineHeight: 1.3 }}>SCHOOL<br />STAMP</span>
            </div>
          </div>
        </div>

        {/* Title band */}
        <div style={{ background: "#1a1a2e", color: "#fff", textAlign: "center", padding: "5px 12px", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, borderBottom: "3px solid #e8314e" }}>
          CONTINUOUS ASSESSMENT REPORT CARD
        </div>

        {/* Bottom stripe */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#2980b9,#27ae60,#f5a623,#e8314e)" }} />
      </div>

      {/* ── Student info ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, border: "1px solid #000" }}>
        <tbody>
          <tr>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000", width: "40%" }}>
              <b>NAME:</b> {student.first_name} {student.last_name}
            </td>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}>
              <b>CLASS:</b> {className}
            </td>
            <td style={{ padding: "3px 6px" }}>
              <b>ADM. NO:</b> {student.admission_number}
            </td>
          </tr>
          <tr style={{ borderTop: "1px solid #000" }}>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}>
              <b>TERM:</b> {termName}
            </td>
            <td style={{ padding: "3px 6px", borderRight: "1px solid #000" }}>
              <b>SESSION:</b> {sessionName}
            </td>
            <td style={{ padding: "3px 6px" }}></td>
          </tr>
        </tbody>
      </table>

      {/* ── Results ── */}
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
              <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>
                {subjectMap[r.subject_id] ?? `Subject ${r.subject_id}`}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>
                {parseFloat(r.ca_score).toFixed(1)}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>
                {parseFloat(r.exam_score).toFixed(1)}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 600 }}>
                {parseFloat(r.total_score).toFixed(1)}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 700,
                color: r.grade === "A" ? "#16a34a" : r.grade === "F" ? "#dc2626" : "#000" }}>
                {r.grade ?? "–"}
              </td>
            </tr>
          ))}
          {results.length === 0 && (
            <tr>
              <td colSpan={5} style={{ border: "1px solid #ccc", padding: 8, textAlign: "center", color: "#888" }}>
                No results recorded for this term
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ fontSize: 9, marginBottom: 8, padding: "3px 6px", border: "1px solid #ccc", display: "inline-block" }}>
        <b>KEY:</b>&nbsp; A = 70–100 &nbsp;|&nbsp; B = 60–69 &nbsp;|&nbsp; C = 50–59 &nbsp;|&nbsp; D = 40–49 &nbsp;|&nbsp; F = 0–39
      </div>

      {/* ── Personal qualities + Attendance ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <table style={{ flex: 2, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a2e", color: "#fff" }}>
              <th style={{ border: "1px solid #333", padding: "3px 6px", textAlign: "left" }}>PERSONAL QUALITIES</th>
              {["A", "B", "C", "D"].map(r => (
                <th key={r} style={{ border: "1px solid #333", padding: "3px 6px", textAlign: "center", width: 22 }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERSONAL_QUALITIES.map(({ key, label }, i) => {
              const rating = (meta as Record<string, string | undefined>)[key];
              return (
                <tr key={key} style={{ background: i % 2 === 0 ? "#f5f5f5" : "#fff" }}>
                  <td style={{ border: "1px solid #ccc", padding: "2px 6px" }}>{label}</td>
                  {["A", "B", "C", "D"].map(r => (
                    <td key={r} style={{ border: "1px solid #ccc", padding: "2px 6px", textAlign: "center",
                      color: "#16a34a", fontWeight: 700 }}>
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
            {([
              ["Times Opened",  meta.times_school_opened],
              ["Times Present", meta.times_present],
              ["Times Late",    meta.times_late],
            ] as [string, number | undefined][]).map(([lbl, val]) => (
              <tr key={lbl}>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{lbl}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", minWidth: 36, fontWeight: 700 }}>
                  {val ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Comments ── */}
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

      {/* ── Signatures ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #000", width: 140, paddingTop: 3, fontSize: 9 }}>Class Teacher&apos;s Signature</div>
        </div>
        <div>
          <b>Next Term Begins:</b>{" "}
          <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: 100, paddingBottom: 1 }}>
            {meta.next_term_begins ?? ""}
          </span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #000", width: 140, paddingTop: 3, fontSize: 9 }}>Head Teacher&apos;s Signature</div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: 14, borderTop: "1px solid #e0e0e0", paddingTop: 5, textAlign: "center", fontSize: 8, color: "#999" }}>
        Hope Hills Academy · Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape, 901101, FCT · Tel: 08065598994 / 07052677702
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EditPanel                                                           */
/* ------------------------------------------------------------------ */
function EditPanel({ meta, setMeta }: { meta: Meta; setMeta: React.Dispatch<React.SetStateAction<Meta>> }) {
  const numField = (label: string, key: keyof Meta) => (
    <div>
      <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>{label}</p>
      <input
        type="number" min={0}
        value={(meta[key] as number | undefined) ?? ""}
        onChange={e => {
          const v = e.target.value === "" ? undefined : parseInt(e.target.value);
          setMeta(m => ({ ...m, [key]: v }));
        }}
        style={inp}
      />
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
                      <button
                        key={r}
                        onClick={() => setMeta(m => ({ ...m, [key]: active ? undefined : r }))}
                        style={{
                          width: 34, height: 32, borderRadius: 6, fontWeight: 700,
                          fontSize: "0.8125rem", cursor: "pointer", transition: "all 0.12s",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                          background: active ? "var(--accent)" : "transparent",
                          color: active ? "var(--btn-primary-text)" : "var(--text-primary)",
                        }}
                      >
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
              <textarea
                rows={3}
                value={(meta[key] as string | undefined) ?? ""}
                onChange={e => setMeta(m => ({ ...m, [key]: e.target.value }))}
                style={{ ...inp, resize: "vertical" }}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Administrative</h3>
        <div style={{ maxWidth: 320 }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>Next Term Begins</p>
          <input
            type="text"
            placeholder="e.g. 10th January, 2026"
            value={(meta.next_term_begins as string | undefined) ?? ""}
            onChange={e => setMeta(m => ({ ...m, next_term_begins: e.target.value }))}
            style={inp}
          />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function ReportCardsPage() {
  const [classes,  setClasses]  = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId,   setClassId]   = useState("");
  const [sessionId, setSessionId] = useState("");
  const [termId,    setTermId]    = useState("");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [results,  setResults]  = useState<Result[]>([]);
  const [meta,     setMeta]     = useState<Meta>({});

  const [tab,     setTab]     = useState<"edit" | "preview">("edit");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/classes"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/subjects"),
    ]).then(([c, s, sub]) => {
      setClasses(c.data.data  || []);
      setSessions(s.data.data || []);
      setSubjects(sub.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) { setTerms([]); setTermId(""); return; }
    api.get(`/api/v1/academic/terms?session_id=${sessionId}`)
      .then(r => setTerms(r.data.data || []))
      .catch(() => {});
  }, [sessionId]);

  const loadStudents = async () => {
    if (!classId) return;
    setLoading(true);
    setSelected(null);
    setResults([]);
    setMeta({});
    try {
      const r = await api.get(`/api/v1/students?class_id=${classId}&limit=200`);
      setStudents(r.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (student: StudentRow) => {
    setSelected(student);
    setResults([]);
    setMeta({});
    if (!sessionId || !termId) return;
    const [resR, metaR] = await Promise.all([
      api.get(`/api/v1/results/student/${student.id}?session_id=${sessionId}&term_id=${termId}`).catch(() => null),
      api.get(`/api/v1/report-cards/${student.id}?term_id=${termId}&session_id=${sessionId}`).catch(() => null),
    ]);
    setResults(resR?.data?.data ?? []);
    setMeta(metaR?.data?.data ?? {});
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
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handlePrint = () => {
    if (!selected || !printRef.current) return;
    const content    = printRef.current.innerHTML;
    const logoUrl    = `${window.location.origin}/hope-hills-logo.png`;
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
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
        .print-btn {
          position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 999;
        }
        .print-btn button {
          padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; font-family: Arial, sans-serif;
        }
        .btn-pdf  { background: #e8314e; color: #fff; }
        .btn-close { background: #eee; color: #333; }
      </style>
      </head><body>
        <div class="print-btn no-print">
          <button class="btn-pdf" onclick="window.print()">⬇ Save as PDF / Print</button>
          <button class="btn-close" onclick="window.close()">✕ Close</button>
        </div>
        ${letterhead}
        ${content}
      </body></html>`);
    win.document.close();
  };

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const selClass   = classes.find(c  => c.id === parseInt(classId));
  const selSession = sessions.find(s => s.id === parseInt(sessionId));
  const selTerm    = terms.find(t    => t.id === parseInt(termId));

  const printCardProps = {
    student:     selected!,
    className:   selClass?.name ?? "",
    sessionName: selSession?.name ?? "",
    termName:    selTerm?.name ?? "",
    results,
    subjectMap,
    meta,
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>Class</p>
            <select
              value={classId}
              onChange={e => { setClassId(e.target.value); setStudents([]); setSelected(null); }}
              style={sel}
            >
              <option value="">Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>Session</p>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={sel}>
              <option value="">Select session…</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 4 }}>Term</p>
            <select value={termId} onChange={e => setTermId(e.target.value)} style={sel} disabled={!sessionId}>
              <option value="">Select term…</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button onClick={loadStudents} disabled={!classId || loading} style={{ ...btnP, alignSelf: "flex-end" }}>
            {loading ? "Loading…" : "Load Students"}
          </button>
        </div>

        {/* Empty state */}
        {students.length === 0 && !loading && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 8, color: "var(--text-secondary)",
            padding: "60px 0",
          }}>
            <Users size={42} style={{ opacity: 0.25 }} />
            <p style={{ fontSize: "0.875rem" }}>Select a class and click Load Students</p>
          </div>
        )}

        {/* Split view */}
        {students.length > 0 && (
          <div style={{ display: "flex", gap: 12, height: "calc(100vh - 230px)", minHeight: 400 }}>

            {/* Student list */}
            <div style={{
              width: 230, flexShrink: 0, display: "flex", flexDirection: "column",
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{
                padding: "9px 14px", borderBottom: "1px solid var(--border)",
                fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0,
              }}>
                {students.length} Students
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
                {students.map(s => (
                  <div
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    style={{
                      padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                      background: selected?.id === s.id ? "var(--accent)" : "transparent",
                      color:      selected?.id === s.id ? "var(--btn-primary-text)" : "var(--text-primary)",
                      fontSize: "0.8125rem", marginBottom: 2, transition: "background 0.1s",
                    }}
                  >
                    {s.first_name} {s.last_name}
                    <div style={{ fontSize: "0.68rem", opacity: 0.65 }}>{s.admission_number}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor / Preview */}
            {!selected ? (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 8, color: "var(--text-secondary)",
                background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10,
              }}>
                <FileText size={40} style={{ opacity: 0.25 }} />
                <p style={{ fontSize: "0.875rem" }}>Select a student to fill their report card</p>
              </div>
            ) : (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                background: "var(--card-bg)", border: "1px solid var(--border)",
                borderRadius: 10, overflow: "hidden",
              }}>
                {/* Tab bar */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                  padding: "8px 14px", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["edit", "preview"] as const).map(t => (
                      <button
                        key={t} onClick={() => setTab(t)}
                        style={{
                          padding: "5px 14px", borderRadius: 7, border: "none",
                          cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500,
                          background: tab === t ? "var(--accent)" : "var(--accent-light)",
                          color:      tab === t ? "var(--btn-primary-text)" : "var(--accent)",
                          transition: "all 0.12s",
                        }}
                      >
                        {t === "edit" ? "Edit" : "Preview"}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    {saved && (
                      <span style={{ fontSize: "0.75rem", color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle size={13} /> Saved
                      </span>
                    )}
                    <button
                      onClick={saveMeta} disabled={saving}
                      style={{ ...btnP, padding: "5px 14px", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Save size={13} />{saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={handlePrint}
                      style={{ ...btnS, padding: "5px 14px", display: "flex", alignItems: "center", gap: 6 }}
                    >
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden print ref when edit tab is active */}
      {selected && tab === "edit" && (
        <div style={{ display: "none" }} ref={printRef}>
          <PrintCard {...printCardProps} />
        </div>
      )}
    </DashboardLayout>
  );
}
