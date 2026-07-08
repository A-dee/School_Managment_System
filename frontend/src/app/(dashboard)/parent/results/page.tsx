"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Download } from "lucide-react";

export default function ParentResultsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [filter, setFilter] = useState({ session_id: "", term_id: "" });
  const [results, setResults] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/parents/me/children"),
      api.get("/api/v1/academic/terms"),
      api.get("/api/v1/academic/sessions"),
    ]).then(([c, t, s]) => {
      const ch = c.data.data || [];
      setChildren(ch);
      const activeChild = ch[0] || null;
      if (activeChild) setSelected(activeChild);
      const termList = t.data.data || [];
      const sessionList = s.data.data || [];
      setTerms(termList);
      setSessions(sessionList);

      const currentSession = sessionList.find((x: any) => x.is_current);
      const currentTerm = termList.find((x: any) => x.is_current);
      if (activeChild && currentSession && currentTerm) {
        setFilter({
          session_id: String(currentSession.id),
          term_id: String(currentTerm.id),
        });
        setLoading(true);
        Promise.all([
          api.get(`/api/v1/results/student/${activeChild.id}`, { params: { session_id: currentSession.id, term_id: currentTerm.id } }),
          api.get(`/api/v1/attendance/student/${activeChild.id}`, { params: { term_id: currentTerm.id } }),
        ]).then(([resRes, attRes]) => {
          setResults(resRes.data.data || []);
          setAttendance(attRes.data.data?.summary || null);
        }).catch(() => {}).finally(() => setLoading(false));
      }
    }).catch(() => {});
  }, []);

  const load = async () => {
    if (!selected || !filter.session_id || !filter.term_id) { toast.error("Select session and term"); return; }
    setLoading(true);
    try {
      const [resRes, attRes] = await Promise.all([
        api.get(`/api/v1/results/student/${selected.id}`, { params: filter }),
        api.get(`/api/v1/attendance/student/${selected.id}`, { params: { term_id: filter.term_id } }),
      ]);
      setResults(resRes.data.data || []);
      setAttendance(attRes.data.data?.summary || null);
    } catch { toast.error("Failed to load results"); }
    setLoading(false);
  };

  const downloadPdf = async () => {
    if (!selected || !filter.session_id || !filter.term_id) { toast.error("Load results first"); return; }
    setDownloading(true);
    try {
      const res = await api.get(`/api/v1/pdfs/report-card/${selected.id}`, {
        params: { session_id: filter.session_id, term_id: filter.term_id },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      const term = terms.find(t => String(t.id) === filter.term_id);
      a.download = `report_card_${selected.first_name}_${selected.last_name}_${term?.name || ""}.pdf`.replace(/\s+/g, "_");
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report card downloaded");
    } catch { toast.error("Results must be published before downloading"); }
    setDownloading(false);
  };

  const avg = results.length > 0 ? results.reduce((s, r) => s + Number(r.total_score), 0) / results.length : 0;

  const gradeColor = (grade: string) => {
    if (grade === "A") return "badge-green";
    if (grade === "F") return "badge-red";
    return "badge-yellow";
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Results</h1>
        <p className="t-text-secondary text-sm mt-1">View and download your child&apos;s report cards</p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {children.map((c: any) => (
            <button key={c.id} onClick={() => { setSelected(c); setResults([]); }}
              className={selected?.id === c.id ? "t-btn-primary text-sm" : "t-btn-secondary text-sm"}>
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}

      <div className="t-card mb-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="t-label">Session</label>
            <select className="t-input w-40" value={filter.session_id} onChange={e => setFilter(p => ({ ...p, session_id: e.target.value }))}>
              <option value="">Select</option>
              {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Term</label>
            <select className="t-input w-40" value={filter.term_id} onChange={e => setFilter(p => ({ ...p, term_id: e.target.value }))}>
              <option value="">Select</option>
              {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button className="t-btn-primary text-sm" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Load Results"}
          </button>
          {results.length > 0 && (
            <button className="t-btn-secondary text-sm flex items-center gap-2" onClick={downloadPdf} disabled={downloading}>
              <Download size={14} />
              {downloading ? "Preparing..." : "Download Report Card"}
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="t-card text-center">
              <p className="t-text-secondary text-sm mb-1">Subjects</p>
              <p className="text-2xl font-bold t-text-primary">{results.length}</p>
            </div>
            <div className="t-card text-center">
              <p className="t-text-secondary text-sm mb-1">Average Score</p>
              <p className="text-2xl font-bold t-text-primary">{avg.toFixed(1)}</p>
            </div>
            <div className="t-card text-center">
              <p className="t-text-secondary text-sm mb-1">Class Position</p>
              <p className="text-2xl font-bold t-text-primary">{results[0]?.class_position || "—"}</p>
            </div>
          </div>

          {attendance && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="t-card text-center">
                <p className="t-text-secondary text-xs mb-1">Times Present</p>
                <p className="text-xl font-bold t-text-primary">{attendance.present}</p>
              </div>
              <div className="t-card text-center">
                <p className="t-text-secondary text-xs mb-1">Times Late</p>
                <p className="text-xl font-bold t-text-primary">{attendance.late}</p>
              </div>
              <div className="t-card text-center">
                <p className="t-text-secondary text-xs mb-1">Times School Opened</p>
                <p className="text-xl font-bold t-text-primary">{attendance.total}</p>
              </div>
            </div>
          )}

          <div className="t-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Subject</th>
                  <th className="pb-3 pr-4 t-text-secondary font-medium text-center">CA (/40)</th>
                  <th className="pb-3 pr-4 t-text-secondary font-medium text-center">Exam (/60)</th>
                  <th className="pb-3 pr-4 t-text-secondary font-medium text-center">Total (/100)</th>
                  <th className="pb-3 t-text-secondary font-medium text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                    <td className="py-2.5 pr-4 t-text-primary font-medium">{r.subject_name || `Subject #${r.subject_id}`}</td>
                    <td className="py-2.5 pr-4 t-text-secondary text-center">{r.ca_score}</td>
                    <td className="py-2.5 pr-4 t-text-secondary text-center">{r.exam_score}</td>
                    <td className="py-2.5 pr-4 font-semibold t-text-primary text-center">{r.total_score}</td>
                    <td className="py-2.5 text-center">
                      <span className={gradeColor(r.grade)}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
