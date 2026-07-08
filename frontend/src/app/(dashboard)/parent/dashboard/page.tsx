"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AnnouncementPanel from "@/components/AnnouncementPanel";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import {
  GraduationCap, CreditCard, ClipboardList, UserCheck,
  MessageSquare, Megaphone, Clock, MapPin
} from "lucide-react";
import { getTimetablePeriods, getClassTimetable } from "@/lib/api";

const getTodayDayName = () => {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayName = days[new Date().getDay()];
  return dayName === "SUNDAY" || dayName === "SATURDAY" ? "MONDAY" : dayName;
};

export default function ParentDashboard() {
  const [children,          setChildren]          = useState<any[]>([]);
  const [selectedChildId,   setSelectedChildId]   = useState<number | null>(null);
  const [announcements,     setAnnouncements]     = useState<any[]>([]);
  const [unread,            setUnread]            = useState(0);
  const [invoices,          setInvoices]          = useState<any[]>([]);
  const [periods,           setPeriods]           = useState<any[]>([]);
  const [slots,             setSlots]             = useState<any[]>([]);
  const [activeDay,         setActiveDay]         = useState(getTodayDayName());
  const [loading,           setLoading]           = useState(true);
  const [ttLoading,         setTtLoading]         = useState(false);

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
        setSelectedChildId(kids[0].id);
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

  useEffect(() => {
    getTimetablePeriods()
      .then(res => {
        const sorted = (res.data.data || []).sort((a: any, b: any) =>
          a.start_time.localeCompare(b.start_time)
        );
        setPeriods(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    const child = children.find(c => c.id === selectedChildId);
    if (!child || !child.current_class_id) {
      setSlots([]);
      setTtLoading(false);
      return;
    }
    setTtLoading(true);
    getClassTimetable(child.current_class_id)
      .then(res => {
        setSlots(res.data.data || []);
      })
      .catch(() => {})
      .finally(() => setTtLoading(false));
  }, [selectedChildId, children]);

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
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* ── Children ── */}
          <div className="t-card" style={{ margin: 0 }}>
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
                  <div key={child.id} style={{ border: `1px solid ${selectedChildId === child.id ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.15s ease", background: selectedChildId === child.id ? "var(--accent-light)" : "transparent" }} onClick={() => setSelectedChildId(child.id)}>
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
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
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

          {/* Child Timetable Widget */}
          {!loading && children.length > 0 && (
            <div className="t-card" style={{ padding: 20, margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <h2 className="font-semibold t-text-primary flex items-center gap-2" style={{ fontSize: "0.875rem", margin: 0 }}>
                  <Clock size={16} className="text-accent" />
                  Academic Schedule
                  {children.length > 1 && (
                    <span className="text-xs text-secondary font-normal">
                      (for {children.find(c => c.id === selectedChildId)?.first_name})
                    </span>
                  )}
                </h2>
                
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Child Selector Tabs (if more than 1 child) */}
                  {children.length > 1 && (
                    <div style={{ display: "flex", gap: 3, background: "var(--bg-page)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
                      {children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedChildId(child.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            border: "none",
                            background: selectedChildId === child.id ? "var(--bg-card)" : "transparent",
                            color: selectedChildId === child.id ? "var(--accent)" : "var(--text-secondary)",
                            cursor: "pointer",
                            boxShadow: selectedChildId === child.id ? "var(--shadow-sm)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {child.first_name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Day selector */}
                  <div style={{ display: "flex", gap: 4, background: "var(--bg-page)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
                    {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map(day => (
                      <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          border: "none",
                          background: activeDay === day ? "var(--accent)" : "transparent",
                          color: activeDay === day ? "var(--btn-primary-text)" : "var(--text-secondary)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {ttLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}><div className="t-spinner" style={{ width: 24, height: 24 }} /></div>
              ) : periods.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>No periods configured.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {periods.map(period => {
                    const slot = slots.find(s => s.day_of_week === activeDay && s.period_id === period.id);
                    const startStr = period.start_time.split(":").slice(0,2).join(":");
                    const endStr = period.end_time.split(":").slice(0,2).join(":");
                    
                    return (
                      <div
                        key={period.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          background: slot ? "var(--accent-light)" : "var(--bg-page)",
                          border: `1px solid ${slot ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: 10,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ minWidth: 90 }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}>
                              <Clock size={11} /> {startStr} - {endStr}
                            </span>
                          </div>
                          <div>
                            {slot ? (
                              <div>
                                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                  {slot.subject_name || "Subject"}
                                </span>
                                {slot.teacher_name && (
                                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: 6 }}>
                                    by {slot.teacher_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                {period.is_academic ? "Free Period" : period.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {slot?.classroom_name && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={11} /> {slot.classroom_name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
