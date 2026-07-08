"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearTokens, getRole, getSubscriptionTier, setSubscriptionTier } from "@/lib/auth";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  CreditCard, BarChart3, ClipboardList, Bell,
  LogOut, School, UserCheck, FileText, DollarSign,
  MessageSquare, Settings, ChevronRight, Calendar, CalendarDays,
  UserCircle, AlertCircle, TrendingUp, BookMarked, X, KeyRound, Megaphone,
  Table, Lock,
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
    { label: "School Calendar",      href: "/calendar",               icon: CalendarDays },
    { label: "Timetable",            href: "/admin/timetable",        icon: Table },
    { label: "Results",              href: "/principal/results",      icon: ClipboardList,  section: "Reports" },
    { label: "Report Cards",         href: "/principal/report-cards", icon: BookMarked },
    { label: "Performance Analytics",href: "/principal/analytics",    icon: TrendingUp },
    { label: "Finance",              href: "/principal/finance",      icon: DollarSign,     section: "Finance" },
    { label: "School Fees",          href: "/admin/fees",             icon: BookOpen },
    { label: "Salary & Payroll",     href: "/admin/payroll",          icon: Users },
    { label: "Expenses",             href: "/admin/expenses",         icon: ClipboardList },
    { label: "Reports",              href: "/principal/reports",      icon: BarChart3 },
    { label: "Audit Logs",           href: "/principal/audit",        icon: FileText,       section: "Administration" },
    { label: "Settings",             href: "/principal/settings",     icon: Settings },
    { label: "Messages",             href: "/messages",               icon: MessageSquare,  section: "Communication" },
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
    { label: "School Calendar",      href: "/calendar",               icon: CalendarDays },
    { label: "Timetable",            href: "/admin/timetable",        icon: Table },
    { label: "Results",              href: "/principal/results",      icon: ClipboardList,  section: "Reports" },
    { label: "Report Cards",         href: "/principal/report-cards", icon: BookMarked },
    { label: "Performance Analytics",href: "/principal/analytics",    icon: TrendingUp },
    { label: "Finance",              href: "/principal/finance",      icon: DollarSign,     section: "Finance" },
    { label: "Invoices",             href: "/admin/invoices",         icon: CreditCard },
    { label: "Payments",             href: "/admin/payments",         icon: DollarSign },
    { label: "School Fees",          href: "/admin/fees",             icon: BookOpen },
    { label: "Salary & Payroll",     href: "/admin/payroll",          icon: Users },
    { label: "Expenses",             href: "/admin/expenses",         icon: ClipboardList },
    { label: "Reports",              href: "/principal/reports",      icon: BarChart3 },
    { label: "Audit Logs",           href: "/principal/audit",        icon: FileText,       section: "Administration" },
    { label: "User Accounts",        href: "/principal/users",        icon: KeyRound },
    { label: "Settings",             href: "/principal/settings",     icon: Settings },
    { label: "Messages",             href: "/messages",               icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",        href: "/principal/announcements",icon: Megaphone },
    { label: "Profile",              href: "/profile",                icon: UserCircle },
  ],
  ADMIN: [
    { label: "Dashboard",        href: "/admin/dashboard",        icon: LayoutDashboard },
    { label: "Sessions & Terms", href: "/principal/academic",     icon: Calendar,       section: "Academic" },
    { label: "School Calendar",  href: "/calendar",               icon: CalendarDays },
    { label: "Students",         href: "/principal/students",     icon: GraduationCap },
    { label: "Parents",          href: "/principal/parents",      icon: UserCircle },
    { label: "Staff",            href: "/principal/staff",        icon: Users },
    { label: "Classes",          href: "/principal/classes",      icon: School },
    { label: "Subjects",         href: "/principal/subjects",     icon: BookOpen },
    { label: "Timetable",        href: "/admin/timetable",        icon: Table },
    { label: "Results",          href: "/principal/results",      icon: ClipboardList,  section: "Reports" },
    { label: "Report Cards",     href: "/principal/report-cards", icon: BookMarked },
    { label: "Invoices",         href: "/admin/invoices",         icon: CreditCard,     section: "Finance" },
    { label: "Payments",         href: "/admin/payments",         icon: DollarSign },
    { label: "School Fees",      href: "/admin/fees",             icon: BookOpen },
    { label: "Expenses",         href: "/admin/expenses",         icon: ClipboardList },
    { label: "Salary & Payroll", href: "/admin/payroll",          icon: Users },
    { label: "Messages",         href: "/messages",               icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",    href: "/principal/announcements",icon: Megaphone },
    { label: "Profile",          href: "/profile",                icon: UserCircle },
  ],
  TEACHER: [
    { label: "Dashboard",       href: "/teacher/dashboard",       icon: LayoutDashboard },
    { label: "School Calendar", href: "/calendar",                icon: CalendarDays,   section: "Academic" },
    { label: "Students",        href: "/principal/students",      icon: GraduationCap },
    { label: "My Classes",      href: "/teacher/classes",         icon: School },
    { label: "Subjects",        href: "/teacher/subjects",        icon: BookOpen },
    { label: "Attendance",      href: "/teacher/attendance",      icon: UserCheck },
    { label: "Discipline",      href: "/teacher/discipline",      icon: FileText },
    { label: "Results",         href: "/teacher/results",         icon: ClipboardList,  section: "Reports" },
    { label: "Report Cards",    href: "/principal/report-cards",  icon: BookMarked },
    { label: "Messages",        href: "/messages",                icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",   href: "/teacher/announcements",   icon: Megaphone },
    { label: "Profile",         href: "/profile",                 icon: UserCircle },
  ],
  TEACHING_STAFF_UNUSED: [], // placeholder to keep structural matching clean
  NON_TEACHING_STAFF: [
    { label: "Dashboard",       href: "/teacher/dashboard",       icon: LayoutDashboard },
    { label: "School Calendar", href: "/calendar",                icon: CalendarDays,   section: "Academic" },
    { label: "Messages",        href: "/messages",                icon: MessageSquare,  section: "Communication" },
    { label: "Profile",         href: "/profile",                 icon: UserCircle },
  ],
  PARENT: [
    { label: "Dashboard",       href: "/parent/dashboard",        icon: LayoutDashboard },
    { label: "School Calendar", href: "/calendar",                icon: CalendarDays,   section: "Academic" },
    { label: "My Children",     href: "/parent/children",         icon: GraduationCap },
    { label: "Attendance",      href: "/parent/attendance",       icon: UserCheck },
    { label: "Results",         href: "/parent/results",          icon: ClipboardList,  section: "Reports" },
    { label: "Fees",            href: "/parent/fees",             icon: CreditCard,     section: "Finance" },
    { label: "Messages",        href: "/messages",                icon: MessageSquare,  section: "Communication" },
    { label: "Announcements",   href: "/parent/announcements",    icon: Megaphone },
    { label: "Profile",         href: "/profile",                 icon: UserCircle },
  ],
  STUDENT: [
    { label: "Dashboard",       href: "/student/dashboard",       icon: LayoutDashboard },
    { label: "School Calendar", href: "/calendar",                icon: CalendarDays,   section: "Academic" },
    { label: "Results",         href: "/student/results",         icon: ClipboardList,  section: "Reports" },
    { label: "Report Card",     href: "/student/report-card",     icon: BookMarked },
    { label: "Fees",            href: "/student/fees",            icon: CreditCard,     section: "Finance" },
    { label: "Messages",        href: "/messages",                icon: MessageSquare,  section: "Communication" },
    { label: "Profile",         href: "/profile",                 icon: UserCircle },
  ],
};

const themes: { id: Theme; label: string; color: string; bg: string }[] = [
  { id: "light",      label: "Light",    color: "#4f46e5", bg: "#eef2ff" },
  { id: "dark",       label: "Dark",     color: "#6366f1", bg: "#0d1117" },
  { id: "glass",      label: "Aurora",   color: "#ec4899", bg: "rgba(188,212,238,0.8)" },
  { id: "nova",       label: "Nova",     color: "#818cf8", bg: "#070412" },
  { id: "business",   label: "Business", color: "#0369a1", bg: "#eef2f8" },
  { id: "mono-glass", label: "Mono",     color: "#6b7280", bg: "rgba(215,220,228,0.9)" },
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

const sectionIcons: Record<string, any> = {
  Academic: GraduationCap,
  Reports: BarChart3,
  Finance: CreditCard,
  Administration: Settings,
  Communication: MessageSquare,
};

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const { theme, setTheme } = useTheme();
  const [role, setRole] = useState("STUDENT");
  const [tier, setTier] = useState("Free");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [showThemes, setShowThemes] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    Academic: false,
    Reports: true,
    Finance: true,
    Administration: true,
    Communication: true,
  });

  const isFeatureEnabled = (label: string, userTier: string): boolean => {
    const t = (userTier || "Free").toUpperCase();
    if (t === "FREE") {
      if (["Salary & Payroll", "Expenses", "Timetable"].includes(label)) {
        return false;
      }
    }
    if (t === "PRO") {
      if (["Salary & Payroll"].includes(label)) {
        return false;
      }
    }
    return true;
  };

  const isFeatureLocked = (label: string) => {
    return !isFeatureEnabled(label, tier);
  };

  const handleItemClick = (e: React.MouseEvent, label: string, href: string) => {
    if (isFeatureLocked(label)) {
      e.preventDefault();
      setSelectedFeature(label);
      setShowUpgradeModal(true);
    } else {
      if (onClose) onClose();
    }
  };

  const getFeatureBenefit = (label: string): string => {
    if (label === "Salary & Payroll") {
      return "Unlock Payroll calculations, automated payslips, and staff bank disbursement integrations.";
    }
    if (label === "Expenses") {
      return "Track school expenditures, capture receipt images, and generate monthly ledger audits.";
    }
    if (label === "Timetable") {
      return "Access the visual timetabling calendar, auto-detect conflicts, and organize period schedules.";
    }
    return "Access advanced dashboards, automated reporting features, and management workflows.";
  };

  const handleUpgrade = () => {
    setSubscriptionTier("Premium");
    setTier("Premium");
    toast.success("Successfully upgraded to Premium!");
    setShowUpgradeModal(false);
    router.refresh();
  };

  useEffect(() => {
    setTier(getSubscriptionTier());
  }, []);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  // Group nav items by section
  interface GroupedItems {
    sectionName: string | null;
    items: typeof navItems;
  }
  const groups: GroupedItems[] = [];
  let currentGroup: GroupedItems = { sectionName: null, items: [] };

  navItems.forEach(item => {
    if (item.section) {
      if (currentGroup.items.length > 0 || currentGroup.sectionName !== null) {
        groups.push(currentGroup);
      }
      currentGroup = { sectionName: item.section, items: [item] };
    } else {
      currentGroup.items.push(item);
    }
  });
  if (currentGroup.items.length > 0 || currentGroup.sectionName !== null) {
    groups.push(currentGroup);
  }

  return (
    <aside
      className={`t-sidebar flex flex-col h-screen shrink-0 t-sidebar-wrapper${isOpen ? " open" : ""}`}
      style={{ width: "min(234px, 86vw)" }}
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
          <div style={{ background: "#0f172a", borderRadius: 8, padding: "5px 10px", display: "inline-flex", alignItems: "center", flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)" }}>
            <img
              src="/lenage-logo.png"
              alt="Lenage Management Systems"
              style={{
                height: 24, width: "auto", objectFit: "contain",
              }}
            />
          </div>
          <div>
            <p style={{
              color: "var(--sidebar-brand)", fontWeight: 700, fontSize: "0.82rem",
              lineHeight: 1.2, letterSpacing: "-0.01em",
            }}>
              Lenage Management Systems
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ color: "var(--sidebar-muted)", fontSize: "0.68rem", letterSpacing: "0.02em" }}>
                {roleLabel[role] || role}
              </span>
              <span style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                padding: "1px 4px",
                borderRadius: 4,
                background: tier === "Premium" ? "rgba(234, 179, 8, 0.15)" : "rgba(255, 255, 255, 0.1)",
                color: tier === "Premium" ? "#eab308" : "var(--sidebar-muted)",
                textTransform: "uppercase",
              }}>
                {tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav ref={navRef} className="flex-1 overflow-y-auto" style={{ padding: "10px 10px", paddingBottom: 4 }}>
        {groups.map(({ sectionName, items }) => {
          if (!sectionName) {
            return items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              const locked = isFeatureLocked(label);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`t-sidebar-item ${active ? "active neumorphic-debossed" : ""}`}
                  style={locked ? { opacity: 0.55 } : undefined}
                  onClick={(e) => handleItemClick(e, label, href)}
                >
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
                  {locked && <Lock size={12} style={{ opacity: 0.75, flexShrink: 0, color: "#eab308" }} />}
                  {active && !locked && <ChevronRight size={11} style={{ opacity: 0.55, flexShrink: 0 }} />}
                </Link>
              );
            });
          }

          const isCollapsed = collapsedSections[sectionName] ?? true;

          return (
            <div key={sectionName} style={{ marginBottom: 4 }}>
              <button
                onClick={() => toggleSection(sectionName)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  marginTop: 6,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--sidebar-muted)",
                  }}>
                    {(() => {
                      const Icon = sectionIcons[sectionName] || BookOpen;
                      return <Icon size={12} />;
                    })()}
                  </span>
                  <span style={{
                    fontSize: "0.74rem",
                    fontWeight: 650,
                    color: "var(--sidebar-text)",
                    letterSpacing: "0.01em",
                  }}>
                    {sectionName}
                  </span>
                </div>
                <ChevronRight
                  size={11}
                  style={{
                    color: "var(--sidebar-muted)",
                    transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                    transition: "transform 0.2s ease",
                    marginLeft: 6,
                    flexShrink: 0,
                  }}
                />
              </button>

              <div style={{
                maxHeight: isCollapsed ? 0 : "1000px",
                overflow: "hidden",
                transition: "max-height 0.3s ease-in-out",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                paddingLeft: 10,
                borderLeft: "1px solid rgba(255,255,255,0.05)",
                marginLeft: 19,
              }}>
                {items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  const locked = isFeatureLocked(label);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`t-sidebar-item ${active ? "active neumorphic-debossed" : ""}`}
                      style={locked ? { opacity: 0.55 } : undefined}
                      onClick={(e) => handleItemClick(e, label, href)}
                    >
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
                      {locked && <Lock size={12} style={{ opacity: 0.75, flexShrink: 0, color: "#eab308" }} />}
                      {active && !locked && <ChevronRight size={11} style={{ opacity: 0.55, flexShrink: 0 }} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Theme picker ── */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setShowThemes(v => !v)}
          className="neumorphic-embossed"
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "rgba(255,255,255,0.06)", border: "none",
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

      {showUpgradeModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 440,
            padding: 24,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
            position: "relative",
          }}>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(234, 179, 8, 0.15)",
                color: "#eab308",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <Lock size={22} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Unlock {selectedFeature}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                This is a premium feature. Please upgrade your subscription tier to access this view.
              </p>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}>
              <h4 style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Feature Benefit:
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4, textAlign: "left" }}>
                {getFeatureBenefit(selectedFeature)}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  router.push("/pricing");
                }}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 16px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                }}
              >
                View Pricing Plans
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleUpgrade}
                  style={{
                    flex: 1,
                    background: "rgba(234, 179, 8, 0.08)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                    color: "#eab308",
                    fontWeight: 600,
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Demo Upgrade
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontWeight: 650,
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
