"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function StudentResultsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [filter, setFilter] = useState({ session_id: "", term_id: "" });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    Promise.allSettled([
      api.get("/api/v1/auth/me"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
    ]).then(([m, s, t]) => {
      if (m.status === "fulfilled") setMe(m.value.data.data);
      const sessionList = s.status === "fulfilled" ? (s.value.data.data || []) : [];
      const termList    = t.status === "fulfilled" ? (t.value.data.data || []) : [];
      setSessions(sessionList);
      setTerms(termList);
      // Auto-select current session and term if available
      const currentSession = sessionList.find((x: any) => x.is_current);
      const currentTerm    = termList.find((x: any) => x.is_current);
      setFilter({
        session_id: currentSession ? String(currentSession.id) : "",
        term_id:    currentTerm    ? String(currentTerm.id)    : "",
      });
    });
  }, []);

  const load = async () => {
    if (!filter.session_id || !filter.term_id) { toast.error("Select session and term"); return; }
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/results/my`, { params: filter });
      setResults(r.data.data || []);
    } catch { toast.error("Failed to load results"); }
    setLoading(false);
  };

  const avg = results.length > 0 ? results.reduce((s, r) => s + Number(r.total_score), 0) / results.length : 0;

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-bold t-text-primary">My Results</h1></div>

      <div className="t-card mb-4 flex gap-3 flex-wrap items-end">
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
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Subjects</p><p className="text-xl font-bold t-text-primary">{results.length}</p></div>
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Average</p><p className="text-xl font-bold t-text-primary">{avg.toFixed(1)}</p></div>
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Class Position</p><p className="text-xl font-bold t-text-primary">{results[0]?.class_position || "—"}</p></div>
          </div>

          <div className="t-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Subject</th>
                  <th className="pb-3 pr-3 t-text-secondary font-medium text-left">CA</th>
                  <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Exam</th>
                  <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Total</th>
                  <th className="pb-3 t-text-secondary font-medium text-left">Grade</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                    <td className="py-2 pr-3 t-text-primary">{r.subject_name || `Subject #${r.subject_id}`}</td>
                    <td className="py-2 pr-3 t-text-secondary">{r.ca_score}</td>
                    <td className="py-2 pr-3 t-text-secondary">{r.exam_score}</td>
                    <td className="py-2 pr-3 font-medium t-text-primary">{r.total_score}</td>
                    <td className="py-2">
                      <span className={r.grade === "F" ? "badge-red" : Number(r.total_score) >= 60 ? "badge-green" : "badge-yellow"}>{r.grade}</span>
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
