"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Megaphone, Trash2, Plus, X, CalendarDays, Palmtree, Bell } from "lucide-react";

type AnnType = "NOTICE" | "EVENT" | "HOLIDAY";

const TYPE_META: Record<AnnType, { label: string; color: string; bg: string; Icon: any }> = {
  NOTICE:  { label: "Notice",  color: "#6366f1", bg: "rgba(99,102,241,0.1)",  Icon: Bell       },
  EVENT:   { label: "Event",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  Icon: CalendarDays },
  HOLIDAY: { label: "Holiday", color: "#22c55e", bg: "rgba(34,197,94,0.1)",   Icon: Palmtree   },
};

const blank = { title: "", message: "", type: "NOTICE" as AnnType, event_date: "", target_roles: "ALL" };

export default function AnnouncementsPage() {
  const [list,    setList]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [form,    setForm]    = useState(blank);
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/api/v1/announcements"); setList(r.data.data || []); }
    catch { toast.error("Failed to load announcements"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error("Title and message are required"); return; }
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(), message: form.message.trim(),
        type: form.type, target_roles: form.target_roles,
      };
      if (form.event_date) body.event_date = form.event_date;
      await api.post("/api/v1/announcements", body);
      toast.success("Announcement sent");
      setShow(false);
      setForm(blank);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to send"); }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(id);
    try { await api.delete(`/api/v1/announcements/${id}`); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setDeleting(null);
  };

  const needsDate = form.type === "EVENT" || form.type === "HOLIDAY";

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Announcements</h1>
          <p className="t-page-subtitle">Send notices, event alerts and holiday messages to students and staff</p>
        </div>
        <button className="t-btn-primary" onClick={() => setShow(v => !v)}>
          {show ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Announcement</>}
        </button>
      </div>

      {/* Create form */}
      {show && (
        <div className="t-card mb-5 animate-fade-in">
          <h2 className="font-semibold t-text-primary mb-4" style={{ fontSize: "0.95rem" }}>New Announcement</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Type selector */}
            <div>
              <label className="t-label">Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["NOTICE", "EVENT", "HOLIDAY"] as AnnType[]).map(t => {
                  const m = TYPE_META[t];
                  const active = form.type === t;
                  return (
                    <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8,
                        border: `2px solid ${active ? m.color : "var(--border)"}`,
                        background: active ? m.bg : "transparent",
                        color: active ? m.color : "var(--text-secondary)",
                        fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
                      <m.Icon size={14} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: needsDate ? "1fr 1fr" : "1fr", gap: 12 }}>
              <div>
                <label className="t-label">Title *</label>
                <input className="t-input" placeholder="e.g. School Closed — Public Holiday"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              {needsDate && (
                <div>
                  <label className="t-label">Date</label>
                  <input type="date" className="t-input" value={form.event_date}
                    onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
                </div>
              )}
            </div>

            <div>
              <label className="t-label">Message *</label>
              <textarea className="t-input" rows={4} placeholder="Write the full announcement..."
                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                style={{ resize: "vertical" }} />
            </div>

            {/* Audience */}
            <div>
              <label className="t-label">Audience</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: "ALL",              label: "Everyone" },
                  { val: "STUDENT",          label: "Students only" },
                  { val: "TEACHER",          label: "Staff only" },
                  { val: "STUDENT,TEACHER",  label: "Students & Staff" },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setForm(p => ({ ...p, target_roles: opt.val }))}
                    style={{ padding: "6px 14px", borderRadius: 7,
                      border: `2px solid ${form.target_roles === opt.val ? "var(--accent)" : "var(--border)"}`,
                      background: form.target_roles === opt.val ? "var(--accent-light)" : "transparent",
                      color: form.target_roles === opt.val ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="t-btn-primary" onClick={save} disabled={saving} style={{ alignSelf: "flex-start", minWidth: 140 }}>
              {saving ? "Sending..." : <><Megaphone size={14} /> Send Announcement</>}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="t-spinner" /></div>
      ) : list.length === 0 ? (
        <div className="t-card t-empty">
          <Megaphone size={40} />
          <p>No announcements yet.</p>
          <p className="text-xs">Click "New Announcement" to send one to students and staff.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((a: any) => {
            const meta = TYPE_META[a.type as AnnType] ?? TYPE_META.NOTICE;
            return (
              <div key={a.id} className="t-card animate-fade-in" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <meta.Icon size={18} style={{ color: meta.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{a.title}</span>
                    <span style={{ padding: "1px 9px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700,
                      background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <span style={{ padding: "1px 9px", borderRadius: 20, fontSize: "0.68rem",
                      background: "var(--accent-light)", color: "var(--accent)" }}>
                      {a.target_roles === "ALL" ? "Everyone" : a.target_roles === "STUDENT,TEACHER" ? "Students & Staff" : a.target_roles === "STUDENT" ? "Students" : "Staff"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 4 }}>{a.message}</p>
                  <div style={{ display: "flex", gap: 14, fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    {a.event_date && <span>📅 {new Date(a.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>}
                    <span>{new Date(a.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                <button onClick={() => del(a.id)} disabled={deleting === a.id}
                  style={{ padding: "5px 8px", borderRadius: 7, background: "var(--badge-danger-bg)",
                    color: "var(--badge-danger-text)", border: "none", cursor: "pointer", flexShrink: 0 }}>
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
