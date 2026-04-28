"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { getClasses } from "@/lib/api";
import toast from "react-hot-toast";
import { getStudents } from "@/lib/api";

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      getClasses({ limit: 100 }),
      api.get("/api/v1/auth/me"),
      api.get("/api/v1/staff/"),
    ]).then(([clsRes, meRes, staffRes]) => {
      const allClasses = clsRes.status === "fulfilled" ? clsRes.value.data.data || [] : [];
      const userId = meRes.status === "fulfilled" ? meRes.value.data.data?.id : null;
      const staffList = staffRes.status === "fulfilled" ? staffRes.value.data.data || [] : [];
      const myStaff = staffList.find((s: any) => s.user_id === userId);
      if (myStaff) {
        const myClasses = allClasses.filter((c: any) => c.class_teacher_id === myStaff.id);
        setClasses(myClasses);
        if (myClasses.length === 1) setClassId(String(myClasses[0].id));
      } else {
        setClasses(allClasses);
      }
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    getStudents({ class_id: classId, limit: 100 }).then(r => {
      const s = r.data.data || [];
      setStudents(s);
      const init: Record<number, string> = {};
      s.forEach((st: any) => { init[st.id] = "PRESENT"; });
      setStatuses(init);
    }).catch(() => {});
  }, [classId]);

  const save = async () => {
    if (!classId || students.length === 0) { toast.error("Select a class first"); return; }
    setSaving(true);
    try {
      await api.post("/api/v1/attendance/bulk", {
        date, class_id: Number(classId),
        records: students.map(s => ({ student_id: s.id, status: statuses[s.id] || "PRESENT" })),
      });
      toast.success("Attendance saved");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-bold t-text-primary">Mark Attendance</h1></div>
      <div className="t-card mb-5 flex gap-3 flex-wrap items-end">
        <div><label className="t-label">Date</label><input className="t-input w-40" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="t-label">Class</label>
          <select className="t-input w-40" value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {students.length > 0 && (
        <div className="t-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold t-text-primary">{students.length} Students</h2>
            <div className="flex gap-2">
              <button className="t-btn-secondary text-xs" onClick={() => { const s: any = {}; students.forEach(st => { s[st.id] = "PRESENT"; }); setStatuses(s); }}>All Present</button>
              <button className="t-btn-secondary text-xs" onClick={() => { const s: any = {}; students.forEach(st => { s[st.id] = "ABSENT"; }); setStatuses(s); }}>All Absent</button>
            </div>
          </div>
          <div className="space-y-2">
            {students.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="t-text-primary text-sm">{s.first_name} {s.last_name} <span className="t-text-secondary text-xs">({s.admission_number})</span></span>
                <div className="flex gap-2">
                  {["PRESENT","LATE","ABSENT"].map(status => (
                    <button key={status} onClick={() => setStatuses(p => ({ ...p, [s.id]: status }))}
                      className={`text-xs px-2 py-1 rounded-lg transition-all ${statuses[s.id] === status ? (status === "PRESENT" ? "badge-green" : status === "LATE" ? "badge-yellow" : "badge-red") : "t-btn-secondary opacity-50"}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="t-btn-primary mt-4 w-full" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
