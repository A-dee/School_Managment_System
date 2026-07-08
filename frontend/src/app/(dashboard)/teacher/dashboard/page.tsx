"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AnnouncementPanel from "@/components/AnnouncementPanel";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Announcement } from "@/lib/announcements";
import { ClipboardList, UserCheck, FileText, School, BookOpen, Clock, MapPin } from "lucide-react";
import { getTimetablePeriods, getTeacherTimetable } from "@/lib/api";

const quickActions = [
  { label: "My Classes",         icon: School,        href: "/teacher/classes",    desc: "View your assigned class & students",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  { label: "Subjects",           icon: BookOpen,      href: "/teacher/subjects",   desc: "Register and view class subjects",     color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  { label: "Upload Results",     icon: ClipboardList, href: "/teacher/results",    desc: "Enter CA & exam scores per student",   color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  { label: "Mark Attendance",    icon: UserCheck,     href: "/teacher/attendance", desc: "Record daily class attendance",        color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  { label: "Discipline Records", icon: FileText,      href: "/teacher/discipline", desc: "Log student incidents & actions",      color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
];

const tips = [
  "Go to Subjects → add the subjects you teach → then enter scores in Results.",
  "Attendance is marked per class session — select the class before marking.",
  "Discipline records are visible to parents and the principal.",
];

const getTodayDayName = () => {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayName = days[new Date().getDay()];
  return dayName === "SUNDAY" || dayName === "SATURDAY" ? "MONDAY" : dayName;
};

export default function TeacherDashboard() {
  const [staff,   setStaff]   = useState<any>(null);
  const [myClass, setMyClass] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState(getTodayDayName());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/api/v1/staff/me"),
      api.get("/api/v1/announcements/"),
      getTimetablePeriods(),
    ])
      .then(async ([staffRes, announcementRes, periodsRes]) => {
        if (!mounted) return;
        
        if (announcementRes.status === "fulfilled") {
          setAnnouncements((announcementRes.value.data.data || []).slice(0, 4));
        }

        if (periodsRes.status === "fulfilled") {
          const sorted = (periodsRes.value.data.data || []).sort((a: any, b: any) =>
            a.start_time.localeCompare(b.start_time)
          );
          setPeriods(sorted);
        }

        if (staffRes.status !== "fulfilled") return;
        const s = staffRes.value.data.data;
        if (!s) return;
        setStaff(s);

        // Fetch Class and Timetable slots
        api.get(`/api/v1/classes/`, { params: { class_teacher_id: s.id, limit: 1 } })
          .then(cr => { if (mounted) setMyClass((cr.data.data || [])[0] ?? null); })
          .catch(() => {});

        getTeacherTimetable(s.id)
          .then(tr => { if (mounted) setSlots(tr.data.data || []); })
          .catch(() => {});
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardLayout>
      {/* Welcome banner */}
      <div className="t-card mb-6 animate-fade-in" style={{
        display: "flex", alignItems: "center", gap: 16, padding: "18px 22px",
        background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg-card) 60%)",
      }}>
        {loading ? (
          <>
            <div className="t-skeleton t-skeleton-circle" style={{ width: 48, height: 48, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="t-skeleton t-skeleton-title mb-2" style={{ width: 220 }} />
              <div className="t-skeleton t-skeleton-text" style={{ width: 180 }} />
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: "var(--accent)", color: "var(--btn-primary-text)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "1.1rem", flexShrink: 0,
              boxShadow: "0 4px 14px color-mix(in srgb, var(--accent) 40%, transparent)",
            }}>
              {staff?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "T"}
            </div>
            <div>
              <h1 className="t-page-title" style={{ marginBottom: 2 }}>
                Welcome back, {staff?.full_name?.split(" ")[0] || "Teacher"}
              </h1>
              <p className="t-page-subtitle">
                {myClass ? `Class Teacher — ${myClass.name} (${myClass.level})` : "No class assigned yet"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="t-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", minHeight: 74 }}>
                <div className="t-skeleton t-skeleton-circle" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="t-skeleton t-skeleton-text mb-2" style={{ width: "55%" }} />
                  <div className="t-skeleton t-skeleton-text" style={{ width: "80%" }} />
                </div>
              </div>
            ))
          : quickActions.map(({ label, icon: Icon, href, desc, color, bg }, i) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div className={`t-card t-card-hover cursor-pointer animate-fade-in delay-${i + 1}`}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px solid ${color}25` }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 2 }}>{label}</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{desc}</p>
                  </div>
                </div>
              </Link>
            ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Timetable Widget */}
          <div className="t-card animate-slide-up" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 className="font-semibold t-text-primary" style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <Clock size={16} className="text-accent" />
                My Timetable
              </h2>
              
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

            {loading ? (
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
                                {slot.subject?.name || "Subject"} ({slot.subject?.code})
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: 6 }}>
                                in Class {slot.class_?.name || "unassigned"}
                              </span>
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

          {/* Quick Tips */}
          <div className="t-card" style={{
            background: "linear-gradient(135deg, var(--bg-card) 0%, var(--accent-light) 100%)",
            margin: 0,
          }}>
            <h2 className="font-semibold t-text-primary mb-3" style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              Quick Tips
            </h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tips.map((tip, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    marginTop: 1, minWidth: 20, height: 20, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--accent)", color: "var(--btn-primary-text)",
                    fontSize: "0.65rem", fontWeight: 800, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span className="t-text-secondary" style={{ fontSize: "0.8125rem", lineHeight: 1.55 }}>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <AnnouncementPanel
          announcements={announcements}
          href="/teacher/announcements"
        />
      </div>
    </DashboardLayout>
  );
}
