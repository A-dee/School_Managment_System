"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStudents } from "@/lib/api";
import toast from "react-hot-toast";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getStudents({ search, limit: 50 })
      .then(res => { setStudents(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Students</h1>
        <p className="text-sm t-text-secondary">{total} students</p>
      </div>
      <div className="t-card mb-4"><input className="t-input max-w-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="t-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Admission No</th>
              <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Name</th>
              <th className="pb-3 pr-4 t-text-secondary font-medium text-left">Class</th>
              <th className="pb-3 t-text-secondary font-medium text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 t-text-secondary">Loading...</td></tr>
            ) : students.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0 hover:opacity-80">
                <td className="py-2 pr-4 font-mono text-xs t-text-secondary">{s.admission_number}</td>
                <td className="py-2 pr-4 t-text-primary">{s.first_name} {s.last_name}</td>
                <td className="py-2 pr-4 t-text-secondary">#{s.current_class_id || "—"}</td>
                <td className="py-2"><span className={s.status === "ACTIVE" ? "badge-green" : "badge-red"}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
