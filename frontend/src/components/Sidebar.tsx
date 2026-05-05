"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearTokens, getRole } from "@/lib/auth";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  CreditCard, BarChart3, ClipboardList, Bell,
  LogOut, School, UserCheck, FileText, DollarSign,
  MessageSquare, Settings, ChevronRight, Calendar,
  UserCircle, AlertCircle, TrendingUp, BookMarked, X, KeyRound, Megaphone,
} from "lucide-react";

const roleNavItems: Record<string, { label: string; href: string; icon: any; section?: string }[]> = {
  PRINCIPAL: [
    { label: "Dashboard",            href: "/principal/dashboard",    icon: LayoutDashboard },
    { label: "Students",             href: "/principal/students",     icon: GraduationCap,  section: "Academic" },
    { label: "Incomplete Profiles",  href: "/principal/incomplete",   icon: AlertCircle },
    { label: "Parents",              href: "/principal/parents",      icon: UserCircle },
    { label: "Staff",                href: "/principal/staff",        icon: Users },
    { label: "Classes",              href: "/principal/classes",      icon: School },
    { label: "Subjects",             href: "/principal/subjects",     icon: BookOpen },
    { label: "Sessions & Terms",     href: "/principal/academic",     icon: Calendar },
    { label: "Results",              href: "/principal/results",      icon: ClipboardList },
    { label: "Report Cards",         href: "/principal/report-cards", icon: BookMarked },
    { label: "Performance Analytics",href: "/principal/analytics",    icon: TrendingUp },
    { label: "Finance",              href: "/principal/finance",      icon: DollarSign,     section: "Admin" },
    { label: "School Fees",          href: "/admin/fees",             icon: BookOpen },
    { label: "Salary & Payroll",     href: "/admin/payroll",          icon: Users },
    { label: "Expenses",             href: "/admin/expenses",         icon: ClipboardList },
    { label: "Reports",              href: "/principal/reports",      icon: BarChart3 },
    { label: "Audit Logs",           href: "/principal/audit",        icon: FileText },
    { label: "Messages",             href: "/messages",               icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",        href: "/principal/announcements",icon: Megaphone },
    { label: "Settings",             href: "/principal/settings",     icon: Settings },
    { label: "Profile",              href: "/profile",                icon: UserCircle },
  ],
  SUPER_ADMIN: [
    { label: "Dashboard",            href: "/principal/dashboard",    icon: LayoutDashboard },
    { label: "Students",             href: "/principal/students",     icon: GraduationCap,  section: "Academic" },
    { label: "Incomplete Profiles",  href: "/principal/incomplete",   icon: AlertCircle },
    { label: "Parents",              href: "/principal/parents",      icon: UserCircle },
    { label: "Staff",                href: "/principal/staff",        icon: Users },
    { label: "Classes",              href: "/principal/classes",      icon: School },
    { label: "Subjects",             href: "/principal/subjects",     icon: BookOpen },
    { label: "Sessions & Terms",     href: "/principal/academic",     icon: Calendar },
    { label: "Performance Analytics",href: "/principal/analytics",    icon: TrendingUp,     section: "Reports" },
    { label: "Report Cards",         href: "/principal/report-cards", icon: BookMarked },
    { label: "Finance",              href: "/principal/finance",      icon: DollarSign,     section: "Admin" },
    { label: "School Fees",          href: "/admin/fees",             icon: BookOpen },
    { label: "Salary & Payroll",     href: "/admin/payroll",          icon: Users },
    { label: "Expenses",             href: "/admin/expenses",         icon: ClipboardList },
    { label: "Reports",              href: "/principal/reports",      icon: BarChart3 },
    { label: "Audit Logs",           href: "/principal/audit",        icon: FileText },
    { label: "User Accounts",        href: "/principal/users",        icon: KeyRound },
    { label: "Messages",             href: "/messages",               icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",        href: "/principal/announcements",icon: Megaphone },
    { label: "Settings",             href: "/principal/settings",     icon: Settings },
    { label: "Profile",              href: "/profile",                icon: UserCircle },
  ],
  ADMIN: [
    { label: "Dashboard",        href: "/admin/dashboard",        icon: LayoutDashboard },
    { label: "Sessions & Terms", href: "/principal/academic",     icon: Calendar,       section: "Academic" },
    { label: "Students",         href: "/principal/students",     icon: GraduationCap },
    { label: "Parents",          href: "/principal/parents",      icon: UserCircle },
    { label: "Staff",            href: "/principal/staff",        icon: Users },
    { label: "Classes",          href: "/principal/classes",      icon: School },
    { label: "Subjects",         href: "/principal/subjects",     icon: BookOpen },
    { label: "Report Cards",     href: "/principal/report-cards", icon: BookMarked },
    { label: "Invoices",         href: "/admin/invoices",         icon: CreditCard,     section: "Finance" },
    { label: "Payments",         href: "/admin/payments",         icon: DollarSign },
    { label: "School Fees",      href: "/admin/fees",             icon: BookOpen },
    { label: "Expenses",         href: "/admin/expenses",         icon: ClipboardList },
    { label: "Salary & Payroll", href: "/admin/payroll",          icon: Users },
    { label: "Messages",         href: "/messages",               icon: MessageSquare,  section: "Communication" },
    { label: "Profile",          href: "/profile",                icon: UserCircle },
  ],
  TEACHER: [
    { label: "Dashboard",       href: "/teacher/dashboard",       icon: LayoutDashboard },
    { label: "Students",        href: "/principal/students",      icon: GraduationCap,  section: "Academic" },
    { label: "My Classes",      href: "/teacher/classes",         icon: School },
    { label: "Subjects",        href: "/teacher/subjects",        icon: BookOpen },
    { label: "Results",         href: "/teacher/results",         icon: ClipboardList },
    { label: "Report Cards",    href: "/principal/report-cards",  icon: BookMarked },
    { label: "Attendance",      href: "/teacher/attendance",      icon: UserCheck },
    { label: "Discipline",      href: "/teacher/discipline",      icon: FileText },
    { label: "Messages",        href: "/messages",                icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",   href: "/teacher/announcements",   icon: Megaphone },
    { label: "Profile",         href: "/profile",                 icon: UserCircle },
  ],
  NON_TEACHING_STAFF: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "Messages",  href: "/messages",          icon: MessageSquare,  section: "Communication" },
    { label: "Profile",   href: "/profile",           icon: UserCircle },
  ],
  PARENT: [
    { label: "Dashboard",     href: "/parent/dashboard",      icon: LayoutDashboard },
    { label: "My Children",   href: "/parent/children",       icon: GraduationCap,  section: "Children" },
    { label: "Fees",          href: "/parent/fees",           icon: CreditCard },
    { label: "Results",       href: "/parent/results",        icon: ClipboardList },
    { label: "Attendance",    href: "/parent/attendance",     icon: UserCheck },
    { label: "Messages",      href: "/messages",              icon: MessageSquare,  section: "Communication" },
    { label: "Announcements", href: "/parent/announcements",  icon: Megaphone },
    { label: "Profile",       href: "/profile",               icon: UserCircle },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Results",   href: "/student/results",   icon: ClipboardList,  section: "Academics" },
    { label: "Fees",      href: "/student/fees",      icon: CreditCard },
    { label: "Messages",  href: "/messages",          icon: MessageSquare,  section: "Communication" },
    { label: "Profile",   href: "/profile",           icon: UserCircle },
  ],
};

const themes: { id: Theme; label: string; color: string; bg: string }[] = [
  { id: "light",    label: "Light",    color: "#4f46e5", bg: "#eef2ff" },
  { id: "dark",     label: "Dark",     color: "#6366f1", bg: "#0d1117" },
  { id: "glass",    label: "Aurora",   color: "#ec4899", bg: "rgba(188,212,238,0.8)" },
  { id: "nova",     label: "Nova",     color: "#818cf8", bg: "#070412" },
  { id: "business", label: "Business", color: "#0369a1", bg: "#eef2f8" },
];

const roleLabel: Record<string, string> = {
  SUPER_ADMIN:        "Proprietor",
  PRINCIPAL:          "Vice Principal",
  ADMIN:              "Principal",
  TEACHER:            "Teacher",
  PARENT:             "Parent",
  STUDENT:            "Student",
  NON_TEACHING_STAFF: "Staff",
};

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const { theme, setTheme } = useTheme();
  const [role, setRole] = useState("STUDENT");
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => { setRole(getRole() || "STUDENT"); }, []);

  const navRef      = useRef<HTMLElement>(null);
  const navItems    = roleNavItems[role] || roleNavItems.STUDENT;
  const activeTheme = themes.find(t => t.id === theme)!

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem("sidebar-scroll");
    if (saved) el.scrollTop = parseInt(saved, 10);
    const onScroll = () => sessionStorage.setItem("sidebar-scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);;

  const handleLogout = () => {
    clearTokens();
    router.replace("/login");
  };

  let lastSection = "";

  return (
    <aside
      className={`t-sidebar flex flex-col h-screen shrink-0 t-sidebar-wrapper${isOpen ? " open" : ""}`}
      style={{ width: 234 }}
    >
      {/* ── Brand ── */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Mobile close button */}
          <button
            className="mobile-close-btn"
            onClick={onClose}
            style={{ display: "none", position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--sidebar-text)" }}
          >
            <X size={16} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hope-hills-logo.png"
            alt="Hope Hills Academy"
            style={{
              width: 40, height: 40, borderRadius: 10, objectFit: "contain",
              background: "#fff", padding: 3, flexShrink: 0,
              boxShadow: "0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          />
          <div>
            <p style={{
              color: "var(--sidebar-brand)", fontWeight: 700, fontSize: "0.82rem",
              lineHeight: 1.2, letterSpacing: "-0.01em",
            }}>
              Hope Hills Academy
            </p>
            <p style={{ color: "var(--sidebar-muted)", fontSize: "0.68rem", marginTop: 1, letterSpacing: "0.02em" }}>
              {roleLabel[role] || role}
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav ref={navRef} className="flex-1 overflow-y-auto" style={{ padding: "10px 10px", paddingBottom: 4 }}>
        {navItems.map(({ label, href, icon: Icon, section }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const showSection = section && section !== lastSection;
          if (showSection) lastSection = section!;

          return (
            <div key={href}>
              {showSection && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 6px" }}>
                  <span style={{
                    fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: "var(--sidebar-muted)",
                  }}>
                    {section}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                </div>
              )}
              <Link href={href} className={`t-sidebar-item ${active ? "active" : ""}`} onClick={onClose}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  background: active ? "rgba(255,255,255,0.15)" : "transparent",
                  transition: "background 0.15s",
                }}>
                  <Icon size={14} />
                </span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                {active && <ChevronRight size={11} style={{ opacity: 0.55, flexShrink: 0 }} />}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Theme picker ── */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setShowThemes(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 9, padding: "7px 10px", cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          <span style={{
            width: 14, height: 14, borderRadius: "50%",
            background: activeTheme.color,
            boxShadow: `0 0 6px ${activeTheme.color}`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.75rem", color: "var(--sidebar-muted)", flex: 1, textAlign: "left" }}>
            {activeTheme.label}
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--sidebar-muted)", opacity: 0.6 }}>
            {showThemes ? "▲" : "▼"}
          </span>
        </button>

        {showThemes && (
          <div style={{
            marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 5, animation: "fadeIn 0.15s ease both",
          }}>
            {themes.map((t) => (
              <button
                key={t.id}
                title={t.label}
                onClick={() => { setTheme(t.id); setShowThemes(false); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "7px 4px", borderRadius: 8, cursor: "pointer",
                  border: theme === t.id ? `1px solid ${t.color}` : "1px solid rgba(255,255,255,0.08)",
                  background: theme === t.id ? `${t.color}18` : "rgba(255,255,255,0.04)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: t.color,
                  boxShadow: theme === t.id ? `0 0 8px ${t.color}` : "none",
                  transition: "box-shadow 0.2s",
                }} />
                <span style={{
                  fontSize: "0.58rem", color: theme === t.id ? t.color : "var(--sidebar-muted)",
                  fontWeight: theme === t.id ? 700 : 400,
                }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom actions ── */}
      <div style={{ padding: "8px 10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/notifications" className="t-sidebar-item">
          <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={14} />
          </span>
          <span>Notifications</span>
        </Link>
        <button
          onClick={handleLogout}
          className="t-sidebar-item"
          style={{ color: "#f87171", marginTop: 2 }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(248,113,113,0.1)",
          }}>
            <LogOut size={14} />
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
