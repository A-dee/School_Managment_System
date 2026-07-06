"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ParentAttendancePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [filter, setFilter] = useState({ session_id: "", term_id: "" });
  const [summary, setSummary] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/parents/me/children"),
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
    ]).then(([c, s, t]) => {
      const ch = c.data.data || [];
      setChildren(ch);
      if (ch.length > 0) setSelected(ch[0]);
      setSessions(s.data.data || []);
      setTerms(t.data.data || []);
    }).catch(() => {});
  }, []);

  const load = async () => {
    if (!selected || !filter.session_id || !filter.term_id) { toast.error("Select session and term"); return; }
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/attendance/student/${selected.id}`, { params: filter });
      const data = r.data.data || [];
      setRecords(data);
      const present = data.filter((a: any) => a.status === "PRESENT").length;
      const late = data.filter((a: any) => a.status === "LATE").length;
      const absent = data.filter((a: any) => a.status === "ABSENT").length;
      setSummary({ present, late, absent, total: data.length });
    } catch { toast.error("Failed to load attendance"); }
    setLoading(false);
  };

  const statusColor = (s: string) => s === "PRESENT" ? "badge-green" : s === "LATE" ? "badge-yellow" : "badge-red";

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-bold t-text-primary">Attendance</h1></div>

      {children.length > 1 && (
        <div className="flex gap-2 mb-4">
          {children.map((c: any) => (
            <button key={c.id} onClick={() => { setSelected(c); setSummary(null); setRecords([]); }}
              className={selected?.id === c.id ? "t-btn-primary text-sm" : "t-btn-secondary text-sm"}>
              {c.first_name}
            </button>
          ))}
        </div>
      )}

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
          {loading ? "Loading..." : "Load Attendance"}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="t-card text-center"><p className="t-text-secondary text-sm">Total Days</p><p className="text-xl font-bold t-text-primary">{summary.total}</p></div>
          <div className="t-card text-center"><p className="t-text-secondary text-sm">Present</p><p className="text-xl font-bold" style={{ color: "#22c55e" }}>{summary.present}</p></div>
          <div className="t-card text-center"><p className="t-text-secondary text-sm">Late</p><p className="text-xl font-bold" style={{ color: "#f59e0b" }}>{summary.late}</p></div>
          <div className="t-card text-center"><p className="t-text-secondary text-sm">Absent</p><p className="text-xl font-bold" style={{ color: "#ef4444" }}>{summary.absent}</p></div>
        </div>
      )}

      {records.length > 0 && (
        <div className="t-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Date</th>
                <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Subject / Class</th>
                <th className="pb-3 t-text-secondary font-medium text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                  <td className="py-2 pr-3 t-text-primary">{a.date}</td>
                  <td className="py-2 pr-3 t-text-secondary">{a.subject_name || `Class #${a.class_id}`}</td>
                  <td className="py-2"><span className={statusColor(a.status)}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && records.length === 0 && (
        <div className="t-card text-center py-10 t-text-secondary">No attendance records found for this period.</div>
      )}
    </DashboardLayout>
  );
}
