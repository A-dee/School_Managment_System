"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { GraduationCap, CreditCard, ClipboardList, UserCheck, MessageSquare } from "lucide-react";

export default function ParentDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/parents/me/children")
      .then(res => setChildren(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    { label: "Fees & Invoices", icon: CreditCard,    href: "/parent/fees",       desc: "Check outstanding balances",   color: "#3b82f6" },
    { label: "Results",         icon: ClipboardList,  href: "/parent/results",    desc: "View published term results",  color: "#22c55e" },
    { label: "Attendance",      icon: UserCheck,      href: "/parent/attendance", desc: "Track attendance records",     color: "#f59e0b" },
    { label: "Messages",        icon: MessageSquare,  href: "/messages",          desc: "Contact school staff",         color: "#a855f7" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">Hope Hills Academy — Parent Portal</h1>
        <p className="t-page-subtitle">Monitor your children's academic progress and fees</p>
      </div>

      {/* Children */}
      <div className="t-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold t-text-primary flex items-center gap-2">
            <GraduationCap size={18} style={{ color: "var(--accent)" }} />
            My Children
            <span className="badge-blue ml-1">{children.length}</span>
          </h2>
          <Link href="/parent/children" className="t-btn-secondary text-xs">View Details</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="t-spinner" /></div>
        ) : children.length === 0 ? (
          <div className="t-empty">
            <GraduationCap size={40} />
            <p className="text-sm">No children linked to your account yet.</p>
            <p className="text-xs">Contact the school office at 08065598994 to link your children.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((child) => (
              <div
                key={child.id}
                className="animate-fade-in"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--accent-light)",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>
                  {child.first_name?.[0]}{child.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="t-text-primary font-semibold text-sm truncate">{child.first_name} {child.last_name}</p>
                  <p className="t-text-secondary text-xs mt-0.5">{child.admission_number}</p>
                </div>
                <span className={child.status === "ACTIVE" ? "badge-green" : "badge-red"}>{child.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(({ label, icon: Icon, href, desc, color }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className="t-card t-card-hover text-center py-5 cursor-pointer animate-fade-in">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <p className="t-text-primary font-semibold text-sm">{label}</p>
              <p className="t-text-secondary text-xs mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
