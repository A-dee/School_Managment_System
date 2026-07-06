"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Check, CheckCheck, Menu, Trash2 } from "lucide-react";
import {
  clearNotification,
  clearReadNotifications,
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { getRole } from "@/lib/auth";

const routeLabels: Record<string, string> = {
  "/principal/dashboard": "Dashboard",
  "/principal/students": "Students",
  "/principal/staff": "Staff",
  "/principal/classes": "Classes",
  "/principal/subjects": "Subjects",
  "/admin/subjects": "Subjects",
  "/principal/results": "Results",
  "/principal/finance": "Finance",
  "/principal/reports": "Reports",
  "/principal/audit": "Audit Logs",
  "/principal/users": "User Accounts",
  "/principal/settings": "Settings",
  "/principal/academic": "Sessions & Terms",
  "/principal/incomplete": "Incomplete Profiles",
  "/principal/parents": "Parents",
  "/principal/analytics": "Performance Analytics",
  "/principal/report-cards": "Report Cards",
  "/admin/dashboard": "Dashboard",
  "/admin/students": "Students",
  "/admin/invoices": "Invoices",
  "/admin/payments": "Payments",
  "/admin/expenses": "Expenses",
  "/admin/fees": "School Fees",
  "/admin/payroll": "Salary & Payroll",
  "/teacher/dashboard": "Dashboard",
  "/teacher/classes": "My Classes",
  "/teacher/subjects": "Subjects",
  "/teacher/results": "Results",
  "/teacher/attendance": "Attendance",
  "/teacher/discipline": "Discipline",
  "/parent/dashboard": "Dashboard",
  "/parent/children": "My Children",
  "/parent/fees": "Fees",
  "/parent/results": "Results",
  "/parent/attendance": "Attendance",
  "/student/dashboard": "Dashboard",
  "/student/results": "Results",
  "/student/fees": "Fees",
  "/messages": "Messages",
  "/notifications": "Notifications",
  "/profile": "My Profile",
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Proprietor",
  PRINCIPAL: "Vice Principal",
  ADMIN: "Principal",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
  NON_TEACHING_STAFF: "Staff",
};

const roleAccent: Record<string, string> = {
  SUPER_ADMIN: "#f59e0b",
  PRINCIPAL: "#6366f1",
  ADMIN: "#4f46e5",
  TEACHER: "#10b981",
  PARENT: "#06b6d4",
  STUDENT: "#a855f7",
  NON_TEACHING_STAFF: "#64748b",
};

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [role, setRole] = useState("");
  const [unread, setUnread] = useState(0);
  const [time, setTime] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationAction, setNotificationAction] = useState<number | "all-read" | "clear-read" | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const label = routeLabels[pathname] || "Hope Hills Academy";

  useEffect(() => {
    setRole(getRole() || "");
  }, []);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 15000);
    return () => clearInterval(id);
  }, []);

  const loadUnread = async () => {
    try {
      const r = await getNotificationUnreadCount();
      setUnread(r.data.data?.unread || 0);
    } catch {}
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const r = await getNotifications();
      setNotifications(r.data.data || []);
    } catch {
      setNotifications([]);
    }
    setNotificationsLoading(false);
  };

  useEffect(() => {
    loadUnread();
  }, [pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;
    loadNotifications();
    loadUnread();
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);

  const markRead = async (id: number) => {
    setNotificationAction(id);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {}
    setNotificationAction(null);
  };

  const markAllRead = async () => {
    setNotificationAction("all-read");
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnread(0);
    } catch {}
    setNotificationAction(null);
  };

  const clearOne = async (id: number) => {
    setNotificationAction(id);
    try {
      const target = notifications.find((item) => item.id === id);
      await clearNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (target && !target.is_read) {
        setUnread((prev) => Math.max(0, prev - 1));
      }
    } catch {}
    setNotificationAction(null);
  };

  const clearViewed = async () => {
    setNotificationAction("clear-read");
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((item) => !item.is_read));
    } catch {}
    setNotificationAction(null);
  };

  const accent = roleAccent[role] || "var(--accent)";
  const initials = (roleLabel[role] || "U").slice(0, 1).toUpperCase();
  const readCount = notifications.filter((item) => item.is_read).length;

  return (
    <header
      className="dashboard-topbar"
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
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          style={{
            display: "none", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: "color-mix(in srgb, var(--accent) 9%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)",
            color: "var(--accent)", cursor: "pointer",
          }}
        >
          <Menu size={18} />
        </button>
        <div className="topbar-title-wrap">
          <h2
            className="topbar-title t-text-primary"
            style={{ fontSize: "0.9375rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}
          >
            {label}
          </h2>
          <p className="topbar-meta" style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 2, letterSpacing: "0.01em" }}>
            {new Date().toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div
          className="topbar-clock"
          style={{
            padding: "5px 12px", borderRadius: 8,
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)",
            fontVariantNumeric: "tabular-nums",
            fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)",
            letterSpacing: "0.02em",
          }}
        >
          {time}
        </div>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="topbar-bell"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            style={{
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 9,
              background: notificationsOpen ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "color-mix(in srgb, var(--accent) 9%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 16%, transparent)",
              color: "var(--accent)",
              transition: "background 0.15s, transform 0.12s, box-shadow 0.15s",
              cursor: "pointer",
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
          </button>

          {notificationsOpen && (
            <div
              className="topbar-notification-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: "min(360px, calc(100vw - 24px))",
                maxHeight: "min(68vh, 520px)",
                overflow: "hidden",
                borderRadius: 16,
                border: "1px solid var(--border-strong, var(--border))",
                background: "var(--bg-card)",
                boxShadow: "0 22px 48px rgba(15,23,42,0.22)",
                display: "flex",
                flexDirection: "column",
                zIndex: 80,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 14px 10px", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div className="t-text-primary" style={{ fontSize: "0.86rem", fontWeight: 700 }}>Notifications</div>
                  <div className="t-text-secondary" style={{ fontSize: "0.72rem", marginTop: 2 }}>
                    {unread > 0 ? `${unread} unread` : "All caught up"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={notificationAction === "all-read"}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
                        fontSize: "0.68rem", fontWeight: 700,
                      }}
                    >
                      <CheckCheck size={12} /> {notificationAction === "all-read" ? "..." : "Read all"}
                    </button>
                  )}
                  {readCount > 0 && (
                    <button
                      type="button"
                      onClick={clearViewed}
                      disabled={notificationAction === "clear-read"}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.18)",
                        background: "rgba(239,68,68,0.06)", color: "#dc2626", cursor: "pointer",
                        fontSize: "0.68rem", fontWeight: 700,
                      }}
                    >
                      <Trash2 size={12} /> {notificationAction === "clear-read" ? "..." : "Clear viewed"}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {notificationsLoading ? (
                  <div className="t-empty" style={{ minHeight: 180 }}>
                    <div className="t-spinner" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="t-empty" style={{ minHeight: 180 }}>
                    <Bell size={26} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px 11px",
                        borderRadius: 12,
                        border: `1px solid ${item.is_read ? "var(--border)" : "color-mix(in srgb, var(--accent) 30%, var(--border))"}`,
                        background: item.is_read ? "color-mix(in srgb, var(--bg-card) 92%, var(--border) 8%)" : "color-mix(in srgb, var(--accent) 8%, var(--bg-card))",
                        opacity: 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span className="t-text-primary" style={{ fontSize: "0.8rem", fontWeight: item.is_read ? 600 : 700 }}>
                              {item.title}
                            </span>
                            {!item.is_read && (
                              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)", flexShrink: 0 }} />
                            )}
                          </div>
                          <p className="t-text-secondary" style={{ fontSize: "0.74rem", lineHeight: 1.45 }}>
                            {item.message}
                          </p>
                          <p className="t-text-secondary" style={{ fontSize: "0.66rem", marginTop: 6 }}>
                            {new Date(item.created_at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                          {!item.is_read && (
                            <button
                              type="button"
                              title="Mark as read"
                              onClick={() => markRead(item.id)}
                              disabled={notificationAction === item.id}
                              style={{
                                width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)",
                                background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <Check size={13} />
                            </button>
                          )}
                          {item.is_read && (
                            <button
                              type="button"
                              title="Clear notification"
                              onClick={() => clearOne(item.id)}
                              disabled={notificationAction === item.id}
                              style={{
                                width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(239,68,68,0.18)",
                                background: "rgba(239,68,68,0.06)", color: "#dc2626", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="topbar-role-pill" style={{
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
          <span className="topbar-role-label" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {roleLabel[role] || role}
          </span>
        </div>
      </div>
    </header>
  );
}
