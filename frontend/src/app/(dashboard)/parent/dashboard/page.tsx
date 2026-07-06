"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AnnouncementPanel from "@/components/AnnouncementPanel";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  GraduationCap, CreditCard, ClipboardList, UserCheck,
  MessageSquare, Megaphone,
} from "lucide-react";

export default function ParentDashboard() {
  const [children,      setChildren]      = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unread,        setUnread]        = useState(0);
  const [invoices,      setInvoices]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    // Load children first, then load per-child invoices using the parent-scoped endpoint
    Promise.allSettled([
      api.get("/api/v1/parents/me/children"),
      api.get("/api/v1/announcements/"),
      api.get("/api/v1/messages/unread/count"),
    ]).then(async ([ch, ann, unr]) => {
      const kids: any[] = ch.status === "fulfilled" ? ch.value.data.data || [] : [];
      if (ann.status === "fulfilled") setAnnouncements((ann.value.data.data || []).slice(0, 3));
      if (unr.status === "fulfilled") setUnread(unr.value.data.data?.unread || 0);
      setChildren(kids);

      if (kids.length > 0) {
        const invResults = await Promise.allSettled(
          kids.map((k: any) => api.get(`/api/v1/finance/invoices/student/${k.id}`))
        );
        const allInvoices = invResults.flatMap(r =>
          r.status === "fulfilled" ? r.value.data.data || [] : []
        );
        setInvoices(allInvoices);
      }
    }).finally(() => setLoading(false));
  }, []);

  const outstanding = invoices.filter((i: any) => i.status !== "PAID");
  const totalOwed   = outstanding.reduce((s: number, i: any) => s + Number(i.balance || 0), 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">Hope Hills Academy — Parent Portal</h1>
        <p className="t-page-subtitle">Monitor your children&apos;s academic progress and fees</p>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<GraduationCap size={20} />}
          label="Children Enrolled"
          value={loading ? "—" : String(children.length)}
          color="#3b82f6"
          href="/parent/children"
        />
        <StatCard
          icon={<CreditCard size={20} />}
          label="Outstanding Fees"
          value={loading ? "—" : outstanding.length === 0 ? "Cleared ✓" : `₦${totalOwed.toLocaleString()}`}
          color={outstanding.length === 0 ? "#22c55e" : "#ef4444"}
          href="/parent/fees"
        />
        <StatCard
          icon={<MessageSquare size={20} />}
          label="Unread Messages"
          value={loading ? "—" : String(unread)}
          color={unread > 0 ? "#f59e0b" : "#64748b"}
          href="/messages"
        />
        <StatCard
          icon={<Megaphone size={20} />}
          label="Announcements"
          value={loading ? "—" : String(announcements.length > 0 ? "New" : "None")}
          color="#a855f7"
          href="/parent/announcements"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Children ── */}
        <div className="lg:col-span-2 t-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold t-text-primary flex items-center gap-2">
              <GraduationCap size={17} style={{ color: "var(--accent)" }} />
              My Children
              <span className="badge-blue ml-1">{children.length}</span>
            </h2>
            <Link href="/parent/children" className="t-btn-secondary text-xs">View Details</Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><div className="t-spinner" /></div>
          ) : children.length === 0 ? (
            <div className="t-empty py-10">
              <GraduationCap size={36} />
              <p className="text-sm">No children linked yet.</p>
              <p className="text-xs">Contact the school office at 08065598994.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {children.map((child: any) => (
                <div key={child.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--btn-primary-text)", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>
                    {child.first_name?.[0]}{child.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="t-text-primary font-semibold text-sm">{child.first_name} {child.last_name}</p>
                    <p className="t-text-secondary text-xs mt-0.5">{child.admission_number}</p>
                  </div>
                  <span className={child.status === "ACTIVE" ? "badge-green" : "badge-red"} style={{ fontSize: "0.68rem" }}>
                    {child.status}
                  </span>
                  <div className="flex gap-2">
                    <Link href="/parent/results" className="t-btn-secondary text-xs py-1 px-2">Results</Link>
                    <Link href="/parent/attendance" className="t-btn-secondary text-xs py-1 px-2">Attendance</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick action links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            {[
              { label: "Fees",        icon: CreditCard,    href: "/parent/fees",          color: "#3b82f6" },
              { label: "Results",     icon: ClipboardList, href: "/parent/results",       color: "#22c55e" },
              { label: "Attendance",  icon: UserCheck,     href: "/parent/attendance",    color: "#f59e0b" },
              { label: "Messages",    icon: MessageSquare, href: "/messages",             color: "#a855f7" },
            ].map(({ label, icon: Icon, href, color }) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div className="t-card-hover" style={{ padding: "10px 8px", borderRadius: 9, border: "1px solid var(--border)", textAlign: "center", cursor: "pointer" }}>
                  <Icon size={18} style={{ color, margin: "0 auto 4px" }} />
                  <p className="t-text-secondary" style={{ fontSize: "0.72rem", fontWeight: 600 }}>{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Announcements ── */}
        <AnnouncementPanel
          announcements={announcements}
          href="/parent/announcements"
          emptyText="No announcements yet."
        />
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: string; color: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="t-card t-card-hover cursor-pointer" style={{ padding: "14px 16px" }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="t-text-secondary" style={{ fontSize: "0.7rem" }}>{label}</p>
            <p className="t-text-primary font-bold" style={{ fontSize: "1rem", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
