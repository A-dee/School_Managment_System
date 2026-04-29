"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import Link from "next/link";
import { GraduationCap, CreditCard, ClipboardList, UserCheck } from "lucide-react";

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [classes,  setClasses]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/api/v1/parents/me/children"),
      api.get("/api/v1/classes?limit=200"),
    ]).then(([c, cls]) => {
      if (c.status === "fulfilled") setChildren(c.value.data.data || []);
      if (cls.status === "fulfilled") setClasses(cls.value.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const getClassName = (id: number | null) => {
    if (!id) return "—";
    const c = classes.find((c: any) => c.id === id);
    return c ? `${c.name} (${c.level})` : `Class #${id}`;
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">My Children</h1>
          <p className="t-page-subtitle">{children.length} child{children.length !== 1 ? "ren" : ""} linked to your account</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="t-spinner" /></div>
      ) : children.length === 0 ? (
        <div className="t-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <GraduationCap size={48} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
          <p className="t-text-secondary" style={{ fontSize: "0.875rem" }}>No children linked to your account yet.</p>
          <p className="t-text-secondary" style={{ fontSize: "0.8rem", marginTop: 4 }}>Contact the school at 08065598994 to link your children.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {children.map((c: any) => (
            <div key={c.id} className="t-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Child header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0 }}>
                  {c.first_name?.[0]}{c.last_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{c.first_name} {c.last_name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>{c.admission_number}</div>
                </div>
                <span className={c.status === "ACTIVE" ? "badge-green" : c.status === "GRADUATED" ? "badge-blue" : "badge-red"}>
                  {c.status}
                </span>
              </div>

              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Class",    value: getClassName(c.current_class_id) },
                  { label: "Gender",   value: c.gender || "—" },
                  { label: "Guardian", value: c.guardian_name || "—" },
                  { label: "Phone",    value: c.guardian_phone || "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--bg-main)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <Link href="/parent/fees" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 9, background: "var(--accent-light)", color: "var(--accent)", textDecoration: "none", fontSize: "0.7rem", fontWeight: 600 }}>
                  <CreditCard size={14} />Fees
                </Link>
                <Link href="/parent/results" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 9, background: "var(--accent-light)", color: "var(--accent)", textDecoration: "none", fontSize: "0.7rem", fontWeight: 600 }}>
                  <ClipboardList size={14} />Results
                </Link>
                <Link href="/parent/attendance" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 9, background: "var(--accent-light)", color: "var(--accent)", textDecoration: "none", fontSize: "0.7rem", fontWeight: 600 }}>
                  <UserCheck size={14} />Attendance
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
