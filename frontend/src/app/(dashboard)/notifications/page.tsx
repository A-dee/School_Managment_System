"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getAnnouncements, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { ANNOUNCEMENT_META, AnnouncementType } from "@/lib/announcements";
import { Bell, CheckCheck, CheckCircle, Megaphone, CalendarDays } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [notifRes, annRes] = await Promise.allSettled([
        getNotifications(),
        getAnnouncements(),
      ]);
      if (notifRes.status === "fulfilled") setNotifications(notifRes.value.data.data || []);
      if (annRes.status === "fulfilled")   setAnnouncements(annRes.value.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="t-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="t-page-title">Notifications</h1>
          <p className="t-page-subtitle">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unread > 0 && (
          <button className="t-btn-secondary" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div className="t-card" style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div className="t-spinner" />
          </div>
        ) : (
          <>
            {/* ── Announcements section ── */}
            {announcements.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px 2px" }}>
                  <Megaphone size={13} style={{ color: "var(--text-secondary)" }} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                    Announcements
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                {announcements.map((a: any) => {
                  const meta = ANNOUNCEMENT_META[a.type as AnnouncementType] ?? ANNOUNCEMENT_META.NOTICE;
                  const AIcon = meta.Icon;
                  return (
                    <div key={`ann-${a.id}`} className="t-card animate-fade-in"
                      style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px",
                        borderLeft: `3px solid ${meta.color}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AIcon size={16} style={{ color: meta.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <p className="t-text-primary" style={{ fontWeight: 600, fontSize: "0.875rem" }}>{a.title}</p>
                          <span style={{ padding: "1px 8px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 700,
                            background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </div>
                        <p className="t-text-secondary" style={{ fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: 4 }}>{a.message}</p>
                        <div style={{ display: "flex", gap: 12, fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                          {a.event_date && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CalendarDays size={12} /> {new Date(a.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                          )}
                          <span>{new Date(a.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── Personal notifications section ── */}
            {notifications.length > 0 && (
              <>
                {announcements.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 2px 2px" }}>
                    <Bell size={13} style={{ color: "var(--text-secondary)" }} />
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                      Personal
                    </span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </div>
                )}
                {notifications.map((n: any) => (
                  <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className="t-card animate-fade-in"
                    style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: n.is_read ? "default" : "pointer",
                      opacity: n.is_read ? 0.6 : 1, padding: "14px 16px",
                      borderLeft: n.is_read ? "3px solid transparent" : "3px solid var(--accent)", transition: "opacity 0.2s" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: n.is_read ? "var(--bg-page)" : "var(--accent-light)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {n.is_read
                        ? <CheckCircle size={16} style={{ color: "var(--text-secondary)" }} />
                        : <Bell size={16} style={{ color: "var(--accent)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <p className="t-text-primary" style={{ fontWeight: n.is_read ? 400 : 600, fontSize: "0.875rem" }}>{n.title}</p>
                        {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                      </div>
                      <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 3, lineHeight: 1.5 }}>{n.message}</p>
                      <p className="t-text-secondary" style={{ fontSize: "0.7rem", marginTop: 5 }}>
                        {new Date(n.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button title="Mark as read"
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", opacity: 0.5, padding: 4, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
                        <CheckCheck size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── Empty state ── */}
            {announcements.length === 0 && notifications.length === 0 && (
              <div className="t-card t-empty" style={{ padding: "56px 24px" }}>
                <Bell size={44} />
                <p className="font-medium">No notifications yet</p>
                <p className="text-xs">You'll see alerts, results, fee updates and announcements here.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
