"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Send, Inbox, Mail, Reply, PenSquare, Search, X, Users, ChevronDown } from "lucide-react";

interface Message {
  id: number;
  sender_user_id: number;
  sender_name: string;
  sender_email: string;
  recipient_user_id: number;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  replies?: Message[];
}

interface Contact {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

interface BroadcastGroup {
  type: string;
  value: string;
  label: string;
  count: number;
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN:        "Proprietor",
  PRINCIPAL:          "Vice Principal",
  ADMIN:              "Principal",
  TEACHER:            "Teacher",
  PARENT:             "Parent",
  NON_TEACHING_STAFF: "Staff",
};

const roleBadge: Record<string, { bg: string; color: string }> = {
  SUPER_ADMIN:        { bg: "rgba(245,158,11,0.15)",  color: "#d97706" },
  PRINCIPAL:          { bg: "rgba(99,102,241,0.15)",  color: "#6366f1" },
  ADMIN:              { bg: "rgba(99,102,241,0.15)",  color: "#6366f1" },
  TEACHER:            { bg: "rgba(16,185,129,0.15)",  color: "#059669" },
  PARENT:             { bg: "rgba(239,68,68,0.15)",   color: "#dc2626" },
  NON_TEACHING_STAFF: { bg: "rgba(100,116,139,0.15)", color: "#64748b" },
};

function RoleBadge({ role }: { role: string }) {
  const s = roleBadge[role] || { bg: "var(--accent-light)", color: "var(--accent)" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 700,
      background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {roleLabel[role] || role}
    </span>
  );
}

function fmtTime(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtFull(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const [tab,      setTab]      = useState<"inbox" | "sent" | "compose">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [unread,   setUnread]   = useState(0);

  // Individual compose
  const [contacts,        setContacts]        = useState<Contact[]>([]);
  const [contactSearch,   setContactSearch]   = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDropdown,    setShowDropdown]    = useState(false);

  // Broadcast compose
  const [broadcastMode,   setBroadcastMode]   = useState(false);
  const [broadcastGroups, setBroadcastGroups] = useState<BroadcastGroup[]>([]);
  const [selectedGroup,   setSelectedGroup]   = useState<BroadcastGroup | null>(null);
  const [showGroupDrop,   setShowGroupDrop]   = useState(false);

  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "compose") { setLoading(false); return; }
      const endpoint = tab === "inbox" ? "/api/v1/messages/inbox" : "/api/v1/messages/sent";
      const [res, unreadRes] = await Promise.all([
        api.get(endpoint),
        api.get("/api/v1/messages/unread/count"),
      ]);
      setMessages(res.data.data || []);
      setUnread(unreadRes.data.data?.unread || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); setSelected(null); }, [tab]);

  useEffect(() => {
    if (tab !== "compose") return;
    api.get("/api/v1/messages/contacts")
      .then(r => setContacts(r.data.data || []))
      .catch(() => setContacts([]));
    api.get("/api/v1/messages/broadcast-groups")
      .then(r => setBroadcastGroups(r.data.data || []))
      .catch(() => setBroadcastGroups([]));
  }, [tab]);

  const resetCompose = () => {
    setSubject(""); setBody("");
    setSelectedContact(null); setContactSearch(""); setShowDropdown(false);
    setSelectedGroup(null); setShowGroupDrop(false);
    setBroadcastMode(false);
  };

  const openMessage = async (msg: Message) => {
    try {
      const res = await api.get(`/api/v1/messages/${msg.id}`);
      setSelected(res.data.data);
      load();
    } catch { setSelected(msg); }
  };

  const sendMessage = async () => {
    if (!selectedContact) { toast.error("Select a recipient"); return; }
    if (!subject.trim() || !body.trim()) { toast.error("Fill subject and message"); return; }
    setSending(true);
    try {
      await api.post("/api/v1/messages/", { recipient_user_id: selectedContact.user_id, subject, body });
      toast.success("Message sent");
      resetCompose();
      setTab("sent");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to send"); }
    setSending(false);
  };

  const sendBroadcast = async () => {
    if (!selectedGroup) { toast.error("Select a group"); return; }
    if (!subject.trim() || !body.trim()) { toast.error("Fill subject and message"); return; }
    setSending(true);
    try {
      const res = await api.post("/api/v1/messages/broadcast", {
        target_type: selectedGroup.type,
        target_value: selectedGroup.value,
        subject,
        body,
      });
      const sentTo: number = res.data.data?.sent_to ?? 0;
      toast.success(`Message sent to ${sentTo} recipient${sentTo !== 1 ? "s" : ""}`);
      resetCompose();
      setTab("sent");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to send broadcast"); }
    setSending(false);
  };

  const sendReply = async () => {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/v1/messages/${selected.id}/reply`, {
        recipient_user_id: selected.sender_user_id,
        subject: selected.subject,
        body: replyBody,
      });
      toast.success("Reply sent");
      setReplyBody("");
      openMessage(selected);
    } catch { toast.error("Failed to send reply"); }
    setSending(false);
  };

  const filteredContacts = useMemo(() =>
    contacts.filter(c =>
      !contactSearch ||
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (roleLabel[c.role] || c.role).toLowerCase().includes(contactSearch.toLowerCase())
    ),
    [contacts, contactSearch]
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="t-page-title">Messages</h1>
          <p className="t-page-subtitle">{unread > 0 ? `${unread} unread message${unread > 1 ? "s" : ""}` : "Inbox & sent messages"}</p>
        </div>
        <button
          className="t-btn-primary"
          onClick={() => { setTab("compose"); setSelected(null); }}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <PenSquare size={14} /> Compose
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, minHeight: 560 }}>

        {/* ── Left: message list ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {(["inbox", "sent"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  background: tab === t ? "var(--accent-light)" : "transparent",
                  color: tab === t ? "var(--accent)" : "var(--text-secondary)",
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {t === "inbox" ? <Inbox size={13} /> : <Send size={13} />}
                {t === "inbox" ? "Inbox" : "Sent"}
                {t === "inbox" && unread > 0 && (
                  <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: "0.6rem", fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}><div className="t-spinner" /></div>
            ) : messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "48px 16px", color: "var(--text-secondary)" }}>
                <Mail size={32} style={{ opacity: 0.25 }} />
                <p style={{ fontSize: "0.8rem" }}>No messages</p>
              </div>
            ) : messages.map(m => {
              const isSelected = selected?.id === m.id;
              const isUnread   = !m.is_read && tab === "inbox";
              const nameText   = tab === "inbox" ? (m.sender_name || m.sender_email) : (m.recipient_name || m.recipient_email);
              return (
                <div
                  key={m.id}
                  onClick={() => openMessage(m)}
                  style={{
                    padding: "11px 14px", cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                    background: isSelected ? "var(--accent-light)" : "transparent",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, minWidth: 0 }}>
                    {isUnread && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.78rem", fontWeight: isUnread ? 700 : 500, color: "var(--text-primary)" }}>
                      {nameText}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {fmtTime(m.created_at)}
                    </span>
                  </div>
                  <p style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.78rem", fontWeight: isUnread ? 600 : 400, color: isUnread ? "var(--text-primary)" : "var(--text-secondary)", marginBottom: 2 }}>
                    {m.subject}
                  </p>
                  <p style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    {m.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: content ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column" }}>

          {/* COMPOSE */}
          {tab === "compose" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 580 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {broadcastMode ? "Broadcast Message" : "New Message"}
                </h2>

                {/* Mode toggle — only shown if broadcast groups exist */}
                {broadcastGroups.length > 0 && (
                  <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", fontSize: "0.78rem", fontWeight: 600 }}>
                    <button
                      onClick={() => { setBroadcastMode(false); setSelectedGroup(null); }}
                      style={{
                        padding: "6px 14px", border: "none", cursor: "pointer",
                        background: !broadcastMode ? "var(--accent)" : "transparent",
                        color: !broadcastMode ? "var(--btn-primary-text)" : "var(--text-secondary)",
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <Mail size={12} /> Individual
                    </button>
                    <button
                      onClick={() => { setBroadcastMode(true); setSelectedContact(null); setContactSearch(""); }}
                      style={{
                        padding: "6px 14px", border: "none", cursor: "pointer",
                        background: broadcastMode ? "var(--accent)" : "transparent",
                        color: broadcastMode ? "var(--btn-primary-text)" : "var(--text-secondary)",
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <Users size={12} /> Broadcast
                    </button>
                  </div>
                )}
              </div>

              {/* ── Recipient: individual ── */}
              {!broadcastMode && (
                <div>
                  <label className="t-label">To *</label>
                  {selectedContact ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "1px solid var(--accent)", background: "var(--accent-light)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {selectedContact.name}
                        </p>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {selectedContact.email}
                        </p>
                      </div>
                      <RoleBadge role={selectedContact.role} />
                      <button
                        onClick={() => { setSelectedContact(null); setContactSearch(""); setShowDropdown(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0, display: "flex", alignItems: "center" }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "relative" }}>
                        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                        <input
                          className="t-input"
                          style={{ paddingLeft: 32 }}
                          placeholder="Search by name or role…"
                          value={contactSearch}
                          onChange={e => { setContactSearch(e.target.value); setShowDropdown(true); }}
                          onFocus={() => setShowDropdown(true)}
                        />
                      </div>
                      {contacts.length === 0 ? (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 6 }}>No contacts available for your role.</p>
                      ) : showDropdown && filteredContacts.length > 0 && (
                        <div style={{
                          position: "absolute", zIndex: 50, width: "100%", maxHeight: 240, overflowY: "auto",
                          background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.18)", marginTop: 4,
                        }}>
                          {filteredContacts.map(c => (
                            <div
                              key={c.user_id}
                              onMouseDown={() => { setSelectedContact(c); setContactSearch(""); setShowDropdown(false); }}
                              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--accent-light)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>
                              </div>
                              <RoleBadge role={c.role} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Recipient: broadcast group ── */}
              {broadcastMode && (
                <div>
                  <label className="t-label">Send To Group *</label>
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowGroupDrop(v => !v)}
                      style={{
                        width: "100%", padding: "9px 12px", borderRadius: 9,
                        border: `1px solid ${selectedGroup ? "var(--accent)" : "var(--border)"}`,
                        background: selectedGroup ? "var(--accent-light)" : "var(--input-bg, var(--card-bg))",
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <Users size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {selectedGroup ? (
                          <>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{selectedGroup.label}</span>
                            <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700 }}>
                              {selectedGroup.count} recipient{selectedGroup.count !== 1 ? "s" : ""}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Select a group…</span>
                        )}
                      </div>
                      <ChevronDown size={14} style={{ color: "var(--text-secondary)", flexShrink: 0, transform: showGroupDrop ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                    </button>

                    {showGroupDrop && (
                      <div style={{
                        position: "absolute", zIndex: 50, width: "100%", maxHeight: 260, overflowY: "auto",
                        background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)", marginTop: 4,
                      }}>
                        {broadcastGroups.map((g, i) => {
                          const isFirst = i === 0 || broadcastGroups[i - 1].type !== g.type;
                          const sectionLabel = g.type === "role" ? "By Role" : "By Class";
                          return (
                            <div key={`${g.type}-${g.value}`}>
                              {isFirst && (
                                <div style={{ padding: "6px 14px 4px", fontSize: "0.65rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>
                                  {sectionLabel}
                                </div>
                              )}
                              <div
                                onMouseDown={() => { setSelectedGroup(g); setShowGroupDrop(false); }}
                                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--accent-light)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                              >
                                <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{g.label}</span>
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", flexShrink: 0, background: "var(--accent-light)", padding: "2px 8px", borderRadius: 20 }}>
                                  {g.count}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedGroup && (
                    <p style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      This message will be sent individually to all <strong style={{ color: "var(--text-primary)" }}>{selectedGroup.count}</strong> {selectedGroup.label.toLowerCase()} — each recipient sees only their own copy.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="t-label">Subject *</label>
                <input className="t-input" placeholder="Message subject" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div>
                <label className="t-label">Message *</label>
                <textarea
                  className="t-input" style={{ minHeight: 160, resize: "vertical" }}
                  placeholder="Write your message here..."
                  value={body} onChange={e => setBody(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {broadcastMode ? (
                  <button
                    className="t-btn-primary"
                    onClick={sendBroadcast}
                    disabled={sending || !selectedGroup}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Users size={13} />
                    {sending ? "Sending…" : selectedGroup ? `Send to ${selectedGroup.count} recipients` : "Send Broadcast"}
                  </button>
                ) : (
                  <button
                    className="t-btn-primary"
                    onClick={sendMessage}
                    disabled={sending || !selectedContact}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Send size={13} /> {sending ? "Sending…" : "Send Message"}
                  </button>
                )}
                <button className="t-btn-secondary" onClick={() => { resetCompose(); setTab("inbox"); }}>
                  Cancel
                </button>
              </div>
            </div>

          /* VIEW MESSAGE */
          ) : selected ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 8 }}>
                  {selected.subject}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>From:</span>
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {selected.sender_name || selected.sender_email}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                    {fmtFull(selected.created_at)}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "0.9rem", marginBottom: 16 }}>
                {selected.body}
              </div>

              {selected.replies && selected.replies.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {selected.replies.length} Repl{selected.replies.length > 1 ? "ies" : "y"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selected.replies.map(r => (
                      <div key={r.id} style={{ padding: "12px 14px", borderRadius: 9, background: "var(--bg-page)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                            {r.sender_name || r.sender_email}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", flexShrink: 0, whiteSpace: "nowrap" }}>
                            {fmtFull(r.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{r.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <textarea
                  className="t-input" style={{ minHeight: 80, resize: "none", marginBottom: 10 }}
                  placeholder="Write a reply…"
                  value={replyBody} onChange={e => setReplyBody(e.target.value)}
                />
                <button className="t-btn-primary" onClick={sendReply} disabled={sending || !replyBody.trim()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Reply size={13} /> {sending ? "Sending…" : "Reply"}
                </button>
              </div>
            </div>

          /* EMPTY STATE */
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-secondary)" }}>
              <Mail size={52} style={{ opacity: 0.18 }} />
              <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Select a message to read</p>
              <p style={{ fontSize: "0.8rem" }}>Or compose a new message using the button above</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
