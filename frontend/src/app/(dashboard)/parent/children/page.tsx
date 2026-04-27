"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/parents/me/children").then(r => setChildren(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-bold t-text-primary">My Children</h1></div>
      {loading ? <div className="t-card text-center py-10 t-text-secondary">Loading...</div>
      : children.length === 0 ? <div className="t-card text-center py-14 t-text-secondary">No children linked to your account</div>
      : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((c: any) => (
            <div key={c.id} className="t-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                  {c.first_name[0]}
                </div>
                <div>
                  <p className="font-semibold t-text-primary">{c.first_name} {c.last_name}</p>
                  <p className="text-xs t-text-secondary">{c.admission_number}</p>
                </div>
                <span className={`ml-auto ${c.status === "ACTIVE" ? "badge-green" : "badge-red"}`}>{c.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="t-text-secondary text-xs">Gender</p><p className="t-text-primary">{c.gender}</p></div>
                <div><p className="t-text-secondary text-xs">Class</p><p className="t-text-primary">{c.current_class_id ? `Class #${c.current_class_id}` : "—"}</p></div>
                <div><p className="t-text-secondary text-xs">Guardian</p><p className="t-text-primary">{c.guardian_name || "—"}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
