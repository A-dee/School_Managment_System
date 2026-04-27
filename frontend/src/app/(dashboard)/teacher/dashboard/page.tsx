"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { ClipboardList, UserCheck, FileText, School } from "lucide-react";

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/auth/me"),
      api.get("/api/v1/teacher/my-classes").catch(() => ({ data: { data: [] } })),
    ]).then(([m, c]) => {
      setMe(m.data.data);
      setClasses(c.data.data || []);
    }).catch(() => {});
  }, []);

  const quickActions = [
    { label: "Upload Results",      icon: ClipboardList, href: "/teacher/results",    desc: "Enter & submit student scores",    color: "blue" },
    { label: "Mark Attendance",     icon: UserCheck,     href: "/teacher/attendance",  desc: "Record daily class attendance",   color: "green" },
    { label: "My Classes",          icon: School,        href: "/teacher/classes",     desc: "View assigned classes & subjects", color: "yellow" },
    { label: "Discipline Records",  icon: FileText,      href: "/teacher/discipline",  desc: "Log student incidents & actions",  color: "red" },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue:   { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6" },
    green:  { bg: "rgba(34,197,94,0.1)",   text: "#22c55e" },
    yellow: { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b" },
    red:    { bg: "rgba(239,68,68,0.1)",   text: "#ef4444" },
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">
          Welcome back{me?.email ? `, ${me.email.split("@")[0]}` : ""}
        </h1>
        <p className="t-page-subtitle">Manage your classes, results, and attendance from here</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map(({ label, icon: Icon, href, desc, color }) => {
          const c = colorMap[color];
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div className="t-card t-card-hover text-center py-6 cursor-pointer animate-fade-in">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: c.bg }}
                >
                  <Icon size={26} style={{ color: c.text }} />
                </div>
                <h3 className="font-semibold t-text-primary text-sm">{label}</h3>
                <p className="t-text-secondary text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="t-card">
        <h2 className="font-semibold t-text-primary mb-1 text-sm">Quick Tips</h2>
        <ul className="space-y-2 mt-3">
          {[
            "Upload results → Submit for principal approval → Results get published.",
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
