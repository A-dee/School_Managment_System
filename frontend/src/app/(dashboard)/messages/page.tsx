"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Send, Inbox, Mail, Reply, PenSquare, Search, X, Users, ChevronDown, ArrowLeft } from "lucide-react";

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
  SUPER_ADMIN:        "Super Admin",
  PRINCIPAL:          "Principal",
  ADMIN:              "Admin",
  TEACHER:            "Teacher",
  PARENT:             "Parent",
  STUDENT:            "Student",
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
    contacts
      .filter(c =>
        !contactSearch ||
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (roleLabel[c.role] || c.role).toLowerCase().includes(contactSearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
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

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 min-h-[560px]">

        {/* ── Left: message list ── */}
        <div className={`t-card p-0 flex flex-col overflow-hidden ${selected || tab === "compose" ? "hidden md:flex" : "flex"}`}>

          {/* Tab bar */}
          <div className="flex border-b t-border">
            {(["inbox", "sent"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-150 ${
                  tab === t
                    ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]"
                    : "bg-transparent border-transparent text-secondary hover:text-primary"
                }`}
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
                  className={`p-3 cursor-pointer border-b t-border border-l-4 transition-all duration-150 ${
                    isSelected
                      ? "bg-[var(--accent-light)] border-l-[var(--accent)]"
                      : "border-l-transparent hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
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
        <div className={`t-card flex flex-col p-6 ${!(selected || tab === "compose") ? "hidden md:flex" : "flex"}`}>

          {/* COMPOSE */}
          {tab === "compose" ? (
            <div className="flex flex-col gap-4 max-w-[580px]">
              <button
                onClick={() => { resetCompose(); setTab("inbox"); }}
                className="md:hidden self-start flex items-center gap-1.5 text-xs font-bold t-text-secondary hover:t-text-primary transition-colors mb-2"
              >
                <ArrowLeft size={14} /> Back to list
              </button>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold text-base t-text-primary">
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
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-light)]">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm t-text-primary truncate mb-0.5">
                          {selectedContact.name}
                        </p>
                        <p className="text-xs t-text-secondary truncate">
                          {selectedContact.email}
                        </p>
                      </div>
                      <RoleBadge role={selectedContact.role} />
                      <button
                        onClick={() => { setSelectedContact(null); setContactSearch(""); setShowDropdown(false); }}
                        className="bg-transparent border-none cursor-pointer t-text-secondary hover:t-text-primary shrink-0 flex items-center mt-0.5"
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
                      ) : showDropdown && (
                        <div className="relative z-10 w-full max-h-[260px] overflow-y-auto bg-[var(--bg-card)] border t-border rounded-xl shadow-lg mt-2">
                          {filteredContacts.length === 0 ? (
                            <div style={{ padding: "12px 14px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              No contacts match your search.
                            </div>
                          ) : filteredContacts.map(c => (
                            <div
                              key={c.user_id}
                              onMouseDown={() => { setSelectedContact(c); setContactSearch(""); setShowDropdown(false); }}
                              className="p-3 cursor-pointer border-b t-border flex items-start gap-3 hover:bg-[var(--accent-light)] transition-colors"
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{c.name}</p>
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
                      <div className="relative z-10 w-full max-h-[260px] overflow-y-auto bg-[var(--bg-card)] border t-border rounded-xl shadow-lg mt-2">
                        {broadcastGroups.map((g, i) => {
                          const isFirst = i === 0 || broadcastGroups[i - 1].type !== g.type;
                          const sectionLabel = g.type === "role" ? "By Role" : "By Class";
                          return (
                            <div key={`${g.type}-${g.value}`}>
                              {isFirst && (
                                <div className="p-3 pb-1 text-[10px] font-extrabold t-text-secondary uppercase tracking-wider border-b t-border">
                                  {sectionLabel}
                                </div>
                              )}
                              <div
                                onMouseDown={() => { setSelectedGroup(g); setShowGroupDrop(false); }}
                                className="p-3 cursor-pointer border-b t-border flex items-center justify-between gap-3 hover:bg-[var(--accent-light)] transition-colors"
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
            <div className="flex flex-col h-full min-h-0">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden self-start flex items-center gap-1.5 text-xs font-bold t-text-secondary hover:t-text-primary transition-colors mb-4"
              >
                <ArrowLeft size={14} /> Back to list
              </button>
              <div className="pb-3 border-b t-border mb-4">
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
                      <div key={r.id} className="p-3.5 rounded-lg bg-[var(--bg-page)] border t-border">
                        <div className="flex justify-between items-center mb-1.5 gap-2 flex-wrap">
                          <span className="font-semibold text-xs t-text-primary truncate min-w-0">
                            {r.sender_name || r.sender_email}
                          </span>
                          <span className="text-[10px] t-text-secondary shrink-0 whitespace-nowrap">
                            {fmtFull(r.created_at)}
                          </span>
                        </div>
                        <p className="text-xs t-text-primary white-space-pre-wrap leading-relaxed">{r.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t t-border pt-4">
                <textarea
                  className="t-input min-h-[80px] resize-none mb-3"
                  placeholder="Write a reply…"
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                />
                <button
                  className="t-btn-primary"
                  onClick={sendReply}
                  disabled={sending || !replyBody.trim()}
                >
                  <Reply size={13} /> {sending ? "Sending…" : "Reply"}
                </button>
              </div>
            </div>

          /* EMPTY STATE */
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 t-text-secondary">
              <Mail size={52} className="opacity-20" />
              <p className="font-semibold text-sm">Select a message to read</p>
              <p className="text-xs">Or compose a new message using the button above</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
