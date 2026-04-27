"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getNotifications } from "@/lib/api";
import api from "@/lib/api";
import { Bell, CheckCheck, CheckCircle } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await api.post(`/api/v1/notifications/${id}/read`).catch(() => {});
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    const unreadItems = notifications.filter(n => !n.is_read);
    await Promise.all(unreadItems.map(n => api.post(`/api/v1/notifications/${n.id}/read`).catch(() => {})));
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
        ) : notifications.length === 0 ? (
          <div className="t-card t-empty" style={{ padding: "56px 24px" }}>
            <Bell size={44} />
            <p className="font-medium">No notifications yet</p>
            <p className="text-xs">You'll see alerts, results and fee updates here.</p>
          </div>
        ) : (
          notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className="t-card animate-fade-in"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                cursor: n.is_read ? "default" : "pointer",
                opacity: n.is_read ? 0.6 : 1,
                padding: "14px 16px",
                borderLeft: n.is_read ? "3px solid transparent" : "3px solid var(--accent)",
                transition: "opacity 0.2s",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: n.is_read ? "var(--bg-page)" : "var(--accent-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {n.is_read
                  ? <CheckCircle size={16} style={{ color: "var(--text-secondary)" }} />
                  : <Bell size={16} style={{ color: "var(--accent)" }} />
                }
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
                <button
                  title="Mark as read"
                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", opacity: 0.5, padding: 4, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                >
                  <CheckCheck size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
