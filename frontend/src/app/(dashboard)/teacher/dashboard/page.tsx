"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { ClipboardList, UserCheck, FileText, School, BookOpen } from "lucide-react";

export default function TeacherDashboard() {
  const [staff,   setStaff]   = useState<any>(null);
  const [myClass, setMyClass] = useState<any>(null);

  useEffect(() => {
    api.get("/api/v1/staff/me").then(r => {
      const s = r.data.data;
      if (!s) return;
      setStaff(s);
      api.get(`/api/v1/classes/?class_teacher_id=${s.id}&limit=10`).then(cr => {
        const cls = cr.data.data || [];
        if (cls.length > 0) setMyClass(cls[0]);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const quickActions = [
    { label: "My Classes",          icon: School,        href: "/teacher/classes",     desc: "View your assigned class & students", color: "yellow" },
    { label: "Subjects",            icon: BookOpen,      href: "/teacher/subjects",    desc: "Register and view class subjects",    color: "blue"   },
    { label: "Upload Results",      icon: ClipboardList, href: "/teacher/results",     desc: "Enter CA & exam scores per student",  color: "green"  },
    { label: "Mark Attendance",     icon: UserCheck,     href: "/teacher/attendance",  desc: "Record daily class attendance",       color: "green"  },
    { label: "Discipline Records",  icon: FileText,      href: "/teacher/discipline",  desc: "Log student incidents & actions",     color: "red"    },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue:   { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6" },
    green:  { bg: "rgba(34,197,94,0.1)",   text: "#22c55e" },
    yellow: { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b" },
    red:    { bg: "rgba(239,68,68,0.1)",   text: "#ef4444" },
  };

  return (
    <DashboardLayout>
      {/* Welcome banner */}
      <div className="t-card mb-6" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0 }}>
          {staff?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "T"}
        </div>
        <div>
          <h1 className="t-page-title" style={{ marginBottom: 2 }}>
            Welcome, {staff?.full_name || "Teacher"}
          </h1>
          <p className="t-page-subtitle">
            {myClass
              ? `Class Teacher — ${myClass.name} (${myClass.level})`
              : staff ? "No class assigned yet" : "Loading…"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {quickActions.map(({ label, icon: Icon, href, desc, color }) => {
          const c = colorMap[color];
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div className="t-card t-card-hover cursor-pointer animate-fade-in" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={22} style={{ color: c.text }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 2 }}>{label}</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="t-card">
        <h2 className="font-semibold t-text-primary mb-1 text-sm">Quick Tips</h2>
        <ul className="space-y-2 mt-3">
          {[
            "Go to Subjects → add the subjects you teach → then enter scores in Results.",
            "Attendance is marked per class session — select the class before marking.",
            "Discipline records are visible to parents and the principal.",
          ].map((tip, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="mt-0.5 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0" style={{ background: "var(--accent-light)", color: "var(--accent-text)" }}>{i + 1}</span>
              <span className="t-text-secondary text-sm">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
