"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { getClasses } from "@/lib/api";
import toast from "react-hot-toast";

export default function ResultsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [filter, setFilter] = useState({ class_id: "", term_id: "", session_id: "" });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getClasses({ limit: 100 }),
      api.get("/api/v1/academic/terms"),
      api.get("/api/v1/academic/sessions"),
    ]).then(([c, t, s]) => {
      setClasses(c.data.data || []);
      setTerms(t.data.data || []);
      setSessions(s.data.data || []);
    }).catch(() => {});
  }, []);

  const load = async () => {
    if (!filter.class_id || !filter.term_id || !filter.session_id) { toast.error("Select class, term, and session"); return; }
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/results/class/${filter.class_id}`, { params: { term_id: filter.term_id, session_id: filter.session_id } });
      setResults(res.data.data || []);
    } catch { toast.error("Failed to load results"); }
    setLoading(false);
  };

  const approve = async () => {
    try { await api.post("/api/v1/results/approve", null, { params: { class_id: filter.class_id, term_id: filter.term_id } }); toast.success("Results approved"); load(); }
    catch { toast.error("Failed"); }
  };

  const publish = async () => {
    try { await api.post("/api/v1/results/publish", null, { params: { class_id: filter.class_id, term_id: filter.term_id } }); toast.success("Results published"); load(); }
    catch { toast.error("Failed"); }
  };

  const statusBadge = (s: string) =>
    ({ DRAFT: "badge-yellow", SUBMITTED: "badge-blue", APPROVED: "badge-green", PUBLISHED: "badge-green" }[s] || "badge-yellow");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Results</h1>
        <p className="text-sm t-text-secondary">Review, approve, and publish student results</p>
      </div>

      <div className="t-card mb-5 flex gap-3 flex-wrap items-end">
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
        <div>
          <label className="t-label">Class</label>
          <select className="t-input w-40" value={filter.class_id} onChange={e => setFilter(p => ({ ...p, class_id: e.target.value }))}>
            <option value="">Select</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="t-btn-primary text-sm" onClick={load} disabled={loading}>Load Results</button>
        {results.length > 0 && (
          <>
            <button className="t-btn-secondary text-sm" onClick={approve}>Approve All</button>
            <button className="t-btn-primary text-sm" onClick={publish}>Publish All</button>
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="t-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }} className="text-left">
                <th className="pb-3 pr-3 t-text-secondary font-medium">Student</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium">Subject</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium">CA</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium">Exam</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium">Total</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium">Grade</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium">Position</th>
                <th className="pb-3 t-text-secondary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0 hover:opacity-80">
                  <td className="py-2 pr-3 t-text-primary">#{r.student_id}</td>
                  <td className="py-2 pr-3 t-text-secondary">#{r.subject_id}</td>
                  <td className="py-2 pr-3 t-text-primary">{r.ca_score}</td>
                  <td className="py-2 pr-3 t-text-primary">{r.exam_score}</td>
                  <td className="py-2 pr-3 font-medium t-text-primary">{r.total_score}</td>
                  <td className="py-2 pr-3"><span className={r.grade === "F" ? "badge-red" : "badge-green"}>{r.grade}</span></td>
                  <td className="py-2 pr-3 t-text-secondary">{r.class_position || "—"}</td>
                  <td className="py-2"><span className={statusBadge(r.status)}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
