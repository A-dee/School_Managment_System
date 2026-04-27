"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/subjects/");
      setSubjects(res.data.data || []);
    } catch { toast.error("Failed to load subjects"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    try { await api.put(`/api/v1/subjects/${id}/approve`); toast.success("Approved"); load(); }
    catch { toast.error("Failed"); }
  };
  const reject = async (id: number) => {
    try { await api.put(`/api/v1/subjects/${id}/reject`); toast.success("Rejected"); load(); }
    catch { toast.error("Failed"); }
  };

  const statusBadge = (s: string) =>
    s === "APPROVED" ? "badge-green" : s === "REJECTED" ? "badge-red" : "badge-yellow";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Subjects</h1>
        <p className="text-sm t-text-secondary">Approve or reject teacher-submitted subjects</p>
      </div>
      <div className="t-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }} className="text-left">
              <th className="pb-3 pr-4 t-text-secondary font-medium">Name</th>
              <th className="pb-3 pr-4 t-text-secondary font-medium">Code</th>
              <th className="pb-3 pr-4 t-text-secondary font-medium">Status</th>
              <th className="pb-3 t-text-secondary font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 t-text-secondary">Loading...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 t-text-secondary">No subjects yet</td></tr>
            ) : subjects.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                <td className="py-3 pr-4 font-medium t-text-primary">{s.name}</td>
                <td className="py-3 pr-4 t-text-secondary font-mono">{s.code}</td>
                <td className="py-3 pr-4"><span className={statusBadge(s.status)}>{s.status}</span></td>
                <td className="py-3 flex gap-2">
                  {s.status === "PENDING" && (<>
                    <button className="t-btn-primary text-xs py-1 px-2" onClick={() => approve(s.id)}>Approve</button>
                    <button className="t-btn-secondary text-xs py-1 px-2" onClick={() => reject(s.id)}>Reject</button>
                  </>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
