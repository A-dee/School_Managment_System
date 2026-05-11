"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { ClipboardList, UserCheck, FileText, School, BookOpen } from "lucide-react";

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

export default function TeacherDashboard() {
  const [staff,   setStaff]   = useState<any>(null);
  const [myClass, setMyClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/api/v1/staff/me")
      .then(r => {
        const s = r.data.data;
        if (!mounted || !s) return;
        setStaff(s);
        api.get(`/api/v1/classes/`, { params: { class_teacher_id: s.id, limit: 1 } })
          .then(cr => { if (mounted) setMyClass((cr.data.data || [])[0] ?? null); })
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

      {/* Tips card */}
      <div className="t-card animate-slide-up delay-5" style={{
        background: "linear-gradient(135deg, var(--bg-card) 0%, var(--accent-light) 100%)",
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
    </DashboardLayout>
  );
}
