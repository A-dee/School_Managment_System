"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api, { getAnnouncements } from "@/lib/api";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  ANNOUNCEMENT_META,
  Announcement,
  AnnouncementType,
  getAnnouncementErrorMessage,
} from "@/lib/announcements";
import toast from "react-hot-toast";
import { CalendarDays, Megaphone, Plus, Trash2, X } from "lucide-react";

const blank = {
  title: "",
  message: "",
  type: "NOTICE" as AnnouncementType,
  event_date: "",
  target_roles: "ALL",
};

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const r = await getAnnouncements({ include_all: true });
      setList(r.data.data || []);
    } catch (e: any) {
      const message = getAnnouncementErrorMessage(e, "Failed to load announcements");
      setLoadError(message);
      toast.error(message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const needsDate = form.type === "EVENT" || form.type === "HOLIDAY";

  const save = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (needsDate && !form.event_date) {
      toast.error("Select an event date");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        target_roles: form.target_roles,
      };
      if (form.event_date) body.event_date = form.event_date;
      await api.post("/api/v1/announcements", body);
      toast.success("Announcement sent");
      setShow(false);
      setForm(blank);
      await load();
    } catch (e: any) {
      toast.error(getAnnouncementErrorMessage(e, "Failed to send announcement"));
    }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/v1/announcements/${id}`);
      toast.success("Announcement deleted");
      await load();
    } catch (e: any) {
      toast.error(getAnnouncementErrorMessage(e, "Failed to delete announcement"));
    }
    setDeleting(null);
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Announcements</h1>
          <p className="t-page-subtitle">Send notices, event alerts and holiday messages to students, parents, and staff</p>
        </div>
        <button className="t-btn-primary" onClick={() => setShow((v) => !v)}>
          {show ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Announcement</>}
        </button>
      </div>

      {show && (
        <div className="t-card mb-5 animate-fade-in">
          <h2 className="font-semibold t-text-primary mb-4" style={{ fontSize: "0.95rem" }}>New Announcement</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="t-label">Type</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["NOTICE", "EVENT", "HOLIDAY"] as AnnouncementType[]).map((type) => {
                  const meta = ANNOUNCEMENT_META[type];
                  const active = form.type === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setForm((prev) => ({ ...prev, type }))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 16px",
                        borderRadius: 8,
                        border: `2px solid ${active ? meta.color : "var(--border)"}`,
                        background: active ? meta.bg : "transparent",
                        color: active ? meta.color : "var(--text-secondary)",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      <meta.Icon size={14} /> {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: needsDate ? "1fr 1fr" : "1fr", gap: 12 }}>
              <div>
                <label className="t-label">Title *</label>
                <input
                  className="t-input"
                  placeholder="e.g. School Closed - Public Holiday"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              {needsDate && (
                <div>
                  <label className="t-label">Date</label>
                  <input
                    type="date"
                    className="t-input"
                    value={form.event_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="t-label">Message *</label>
              <textarea
                className="t-input"
                rows={4}
                placeholder="Write the full announcement..."
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </div>

            <div>
              <label className="t-label">Audience</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setForm((prev) => ({ ...prev, target_roles: opt.val }))}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 7,
                      border: `2px solid ${form.target_roles === opt.val ? "var(--accent)" : "var(--border)"}`,
                      background: form.target_roles === opt.val ? "var(--accent-light)" : "transparent",
                      color: form.target_roles === opt.val ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="t-btn-primary" onClick={save} disabled={saving} style={{ alignSelf: "flex-start", minWidth: 160 }}>
              {saving ? "Sending..." : <><Megaphone size={14} /> Send Announcement</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="t-spinner" /></div>
      ) : loadError ? (
        <div className="t-card t-empty">
          <Megaphone size={40} />
          <p>Could not load announcements.</p>
          <p className="text-xs">{loadError}</p>
          <button className="t-btn-secondary" onClick={load}>Retry</button>
        </div>
      ) : list.length === 0 ? (
        <div className="t-card t-empty">
          <Megaphone size={40} />
          <p>No announcements yet.</p>
          <p className="text-xs">Click "New Announcement" to send one to students, parents, and staff.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((announcement) => {
            const meta = ANNOUNCEMENT_META[announcement.type] ?? ANNOUNCEMENT_META.NOTICE;
            return (
              <div key={announcement.id} className="t-card animate-fade-in" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: meta.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <meta.Icon size={18} style={{ color: meta.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{announcement.title}</span>
                    <span style={{ padding: "1px 9px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span style={{ padding: "1px 9px", borderRadius: 20, fontSize: "0.68rem", background: "var(--accent-light)", color: "var(--accent)" }}>
                      {ANNOUNCEMENT_AUDIENCE_LABELS[announcement.target_roles] || announcement.target_roles}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 4 }}>
                    {announcement.message}
                  </p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    {announcement.event_date && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <CalendarDays size={12} />
                        {new Date(announcement.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                    <span>{new Date(announcement.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {announcement.creator_name && <span>By {announcement.creator_name}</span>}
                  </div>
                </div>
                <button
                  onClick={() => del(announcement.id)}
                  disabled={deleting === announcement.id}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 7,
                    background: "var(--badge-danger-bg)",
                    color: "var(--badge-danger-text)",
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
