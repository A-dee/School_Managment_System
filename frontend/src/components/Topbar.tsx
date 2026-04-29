"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getRole } from "@/lib/auth";

const routeLabels: Record<string, string> = {
  "/principal/dashboard":    "Dashboard",
  "/principal/students":     "Students",
  "/principal/staff":        "Staff",
  "/principal/classes":      "Classes",
  "/principal/subjects":     "Subjects",
  "/admin/subjects":         "Subjects",
  "/principal/results":      "Results",
  "/principal/finance":      "Finance",
  "/principal/reports":      "Reports",
  "/principal/audit":        "Audit Logs",
  "/principal/settings":     "Settings",
  "/principal/academic":     "Sessions & Terms",
  "/principal/incomplete":   "Incomplete Profiles",
  "/principal/parents":      "Parents",
  "/principal/analytics":    "Performance Analytics",
  "/principal/report-cards": "Report Cards",
  "/admin/dashboard":        "Dashboard",
  "/admin/students":         "Students",
  "/admin/invoices":         "Invoices",
  "/admin/payments":         "Payments",
  "/admin/expenses":         "Expenses",
  "/admin/fees":             "School Fees",
  "/admin/payroll":          "Salary & Payroll",
  "/teacher/dashboard":      "Dashboard",
  "/teacher/classes":        "My Classes",
  "/teacher/subjects":       "Subjects",
  "/teacher/results":        "Results",
  "/teacher/attendance":     "Attendance",
  "/teacher/discipline":     "Discipline",
  "/parent/dashboard":       "Dashboard",
  "/parent/children":        "My Children",
  "/parent/fees":            "Fees",
  "/parent/results":         "Results",
  "/parent/attendance":      "Attendance",
  "/student/dashboard":      "Dashboard",
  "/student/results":        "Results",
  "/student/fees":           "Fees",
  "/messages":               "Messages",
  "/notifications":          "Notifications",
  "/profile":                "My Profile",
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN:        "Proprietor",
  PRINCIPAL:          "Vice Principal",
  ADMIN:              "Principal",
  TEACHER:            "Teacher",
  PARENT:             "Parent",
  STUDENT:            "Student",
  NON_TEACHING_STAFF: "Staff",
};

const roleAccent: Record<string, string> = {
  SUPER_ADMIN:        "#f59e0b",
  PRINCIPAL:          "#6366f1",
  ADMIN:              "#4f46e5",
  TEACHER:            "#10b981",
  PARENT:             "#06b6d4",
  STUDENT:            "#a855f7",
  NON_TEACHING_STAFF: "#64748b",
};

export default function Topbar() {
  const pathname = usePathname();
  const [role,   setRole]   = useState("");
  const [unread, setUnread] = useState(0);
  const [time,   setTime]   = useState("");
  const label = routeLabels[pathname] || "Hope Hills Academy";

  useEffect(() => { setRole(getRole() || ""); }, []);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get("/api/v1/notifications").then(r => {
      const items: any[] = r.data.data || [];
      setUnread(items.filter(n => !n.is_read).length);
    }).catch(() => {});
  }, [pathname]);

  const accent = roleAccent[role] || "var(--accent)";
  const initials = (roleLabel[role] || "U").slice(0, 1).toUpperCase();

  return (
    <header
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid var(--topbar-border)",
        height: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        gap: 12,
      }}
    >
      {/* Left – page title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div>
          <h2
            className="t-text-primary"
            style={{ fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}
          >
            {label}
          </h2>
          <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 2, letterSpacing: "0.01em" }}>
            {new Date().toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Right – clock · notifications · profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

        {/* Clock */}
        <div style={{
          padding: "5px 12px", borderRadius: 8,
          background: "color-mix(in srgb, var(--accent) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)",
          fontVariantNumeric: "tabular-nums",
          fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)",
          letterSpacing: "0.02em",
        }}>
          {time}
        </div>

        {/* Notification bell */}
        <Link
          href="/notifications"
          style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 9,
            background: "color-mix(in srgb, var(--accent) 9%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)",
            color: "var(--accent)",
            transition: "background 0.15s, transform 0.12s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 16%, transparent)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 9%, transparent)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          <Bell size={15} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -5, right: -5,
              minWidth: 17, height: 17, borderRadius: 999,
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.58rem", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px",
              border: "2px solid var(--topbar-bg)",
              lineHeight: 1,
            }}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>

        {/* Role pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 12px 5px 5px", borderRadius: 10,
          background: "color-mix(in srgb, var(--accent) 9%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, #000) 100%)`,
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 800,
            boxShadow: `0 2px 6px color-mix(in srgb, ${accent} 45%, transparent)`,
          }}>
            {initials}
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {roleLabel[role] || role}
          </span>
        </div>
      </div>
    </header>
  );
}
