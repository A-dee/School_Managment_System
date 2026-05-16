"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function DisciplinePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: "", incident: "", action_taken: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/api/v1/discipline/"); setRecords(r.data.data || []); }
    catch { toast.error("Failed to load"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const staffRes = await api.get("/api/v1/staff/me");
        const staff = staffRes.data.data;
        const classRes = await api.get("/api/v1/classes/", { params: { class_teacher_id: staff.id, limit: 1 } });
        const cls = (classRes.data.data || [])[0];
        if (!cls) {
          setStudents([]);
          return;
        }
        const stuRes = await api.get("/api/v1/students/", { params: { class_id: cls.id, limit: 200 } });
        setStudents(stuRes.data.data || []);
      } catch {
        setStudents([]);
      }
    };
    loadStudents();
  }, []);

  const save = async () => {
    if (!form.student_id || !form.incident) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await api.post("/api/v1/discipline/", { ...form, student_id: Number(form.student_id) });
      toast.success("Record created");
      setShowForm(false);
      setForm({ student_id: "", incident: "", action_taken: "", date: new Date().toISOString().split("T")[0] });
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold t-text-primary">Discipline Records</h1></div>
        <button className="t-btn-primary text-sm" onClick={() => setShowForm(v => !v)}>{showForm ? "Cancel" : "+ Add Record"}</button>
      </div>

      {showForm && (
        <div className="t-card mb-5 max-w-lg">
          <h2 className="font-semibold t-text-primary mb-4">New Discipline Record</h2>
          <div className="space-y-3">
            <div>
              <label className="t-label">Student *</label>
              <select className="t-input" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
                <option value="">Select student</option>
                {students.map((student: any) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.admission_number})
                  </option>
                ))}
              </select>
            </div>
            <div><label className="t-label">Incident *</label><textarea className="t-input" rows={3} placeholder="Describe the incident..." value={form.incident} onChange={e => setForm(p => ({ ...p, incident: e.target.value }))} /></div>
            <div><label className="t-label">Action Taken</label><input className="t-input" placeholder="What action was taken?" value={form.action_taken} onChange={e => setForm(p => ({ ...p, action_taken: e.target.value }))} /></div>
            <div><label className="t-label">Date</label><input className="t-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
          </div>
          <button className="t-btn-primary mt-4 text-sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Create Record"}</button>
        </div>
      )}

      <div className="t-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Student</th>
              <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Incident</th>
              <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Action</th>
              <th className="pb-3 t-text-secondary font-medium text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="text-center py-10 t-text-secondary">Loading...</td></tr>
            : records.length === 0 ? <tr><td colSpan={4} className="text-center py-10 t-text-secondary">No records yet</td></tr>
            : records.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0 hover:opacity-80">
                <td className="py-2 pr-4 t-text-primary">Student #{r.student_id}</td>
                <td className="py-2 pr-4 t-text-secondary max-w-xs truncate">{r.incident}</td>
                <td className="py-2 pr-4 t-text-secondary">{r.action_taken || "—"}</td>
                <td className="py-2 t-text-secondary">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
