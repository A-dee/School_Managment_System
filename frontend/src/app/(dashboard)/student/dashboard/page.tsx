"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { getAnnouncements } from "@/lib/api";
import { ClipboardList, CreditCard, MessageSquare, UserCheck, Bell, CalendarDays, Palmtree, Megaphone } from "lucide-react";

const ANN_META: Record<string, { color: string; bg: string; Icon: any }> = {
  NOTICE:  { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  Icon: Bell },
  EVENT:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  Icon: CalendarDays },
  HOLIDAY: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   Icon: Palmtree },
};

const links = [
  { label: "My Results",  icon: ClipboardList, href: "/student/results", desc: "View term results & grades",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  { label: "Fee Status",  icon: CreditCard,    href: "/student/fees",    desc: "Check invoices & payments",  color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  { label: "Attendance",  icon: UserCheck,     href: "/parent/attendance", desc: "View your attendance records", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { label: "Messages",    icon: MessageSquare, href: "/messages",        desc: "Contact teachers or admin",  color: "#a855f7", bg: "rgba(168,85,247,0.1)"  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentDashboard() {
  const [me,            setMe]            = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/api/v1/auth/me"),
      getAnnouncements(),
    ]).then(([meRes, annRes]) => {
      if (!mounted) return;
      if (meRes.status === "fulfilled")  setMe(meRes.value.data.data);
      if (annRes.status === "fulfilled") setAnnouncements((annRes.value.data.data || []).slice(0, 3));
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const displayName = me?.email ? me.email.split("@")[0] : null;

  return (
    <DashboardLayout>
      {/* Greeting */}
      <div className="mb-6 animate-fade-in">
        {loading ? (
          <>
            <div className="t-skeleton t-skeleton-title mb-2" style={{ width: 260 }} />
            <div className="t-skeleton t-skeleton-text" style={{ width: 200 }} />
          </>
        ) : (
          <>
            <h1 className="t-page-title">
              {greeting()}{displayName ? `, ${displayName}` : ""}!
            </h1>
            <p className="t-page-subtitle">Here&apos;s a quick overview of your portal</p>
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="t-card" style={{ textAlign: "center", padding: "28px 16px" }}>
                <div className="t-skeleton t-skeleton-circle mx-auto mb-4" style={{ width: 56, height: 56 }} />
                <div className="t-skeleton t-skeleton-text mb-2 mx-auto" style={{ width: "60%" }} />
                <div className="t-skeleton t-skeleton-text mx-auto" style={{ width: "80%" }} />
              </div>
            ))
          : links.map(({ label, icon: Icon, href, desc, color, bg }, i) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div className={`t-card t-card-hover text-center cursor-pointer animate-fade-in delay-${i + 1}`} style={{ padding: "24px 16px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: bg, border: `1px solid ${color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Icon size={26} style={{ color }} />
                  </div>
                  <h3 className="t-text-primary" style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: 3 }}>{label}</h3>
                  <p className="t-text-secondary" style={{ fontSize: "0.75rem", lineHeight: 1.4 }}>{desc}</p>
                </div>
              </Link>
            ))
        }
      </div>

      {/* Announcements preview */}
      {!loading && announcements.length > 0 && (
        <div className="t-card animate-slide-up delay-3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 className="font-semibold t-text-primary" style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 7 }}>
              <Megaphone size={15} style={{ color: "var(--accent)" }} />
              School Announcements
            </h2>
            <Link href="/notifications" style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
              View all
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {announcements.map((a: any) => {
              const meta = ANN_META[a.type] ?? ANN_META.NOTICE;
              const AIcon = meta.Icon;
              return (
                <div key={a.id} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: "10px 12px", borderRadius: 9,
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${meta.color}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AIcon size={15} style={{ color: meta.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="t-text-primary" style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                    <p className="t-text-secondary" style={{ fontSize: "0.75rem", lineHeight: 1.45,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.message}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", flexShrink: 0, marginTop: 2 }}>
                    {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty announcements help text */}
      {!loading && announcements.length === 0 && (
        <div className="t-card animate-slide-up delay-3" style={{ padding: "14px 18px" }}>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>
            Need help? Send a message to your teacher or admin via the{" "}
            <Link href="/messages" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Messages</Link> section.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
