"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Calendar, ChevronDown, ChevronUp, X, Pencil, Trash2, Plus, AlertCircle } from "lucide-react";

interface Term {
  id: number;
  name: string;
  session_id: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface AcSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  terms?: Term[];
}

const blankSession = { name: "", start_date: "", end_date: "", is_current: false };
const blankTerm = { name: "", start_date: "", end_date: "" };

export default function AcademicPage() {
  const [sessions, setSessions] = useState<AcSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankSession);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // per-session "add term" form
  const [addingTermFor, setAddingTermFor] = useState<number | null>(null);
  const [termForm, setTermForm] = useState(blankTerm);
  const [termSaving, setTermSaving] = useState(false);

  // editing a term
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [editForm, setEditForm] = useState(blankTerm);
  const [editSaving, setEditSaving] = useState(false);

  const [deletingTerm, setDeletingTerm] = useState<number | null>(null);
  const [deletingSession, setDeletingSession] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sesRes, termRes] = await Promise.all([
        api.get("/api/v1/academic/sessions"),
        api.get("/api/v1/academic/terms"),
      ]);
      const allTerms: Term[] = termRes.data.data || [];
      const sess: AcSession[] = (sesRes.data.data || []).map((s: AcSession) => ({
        ...s,
        terms: allTerms.filter(t => t.session_id === s.id),
      }));
      setSessions(sess);
    } catch { toast.error("Failed to load academic data"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const createSession = async () => {
    if (!form.name || !form.start_date || !form.end_date) { toast.error("Fill all fields"); return; }
    if (form.start_date >= form.end_date) { toast.error("End date must be after start date"); return; }
    setSaving(true);
    try {
      await api.post("/api/v1/academic/sessions", {
        name: form.name, start_date: form.start_date,
        end_date: form.end_date, is_current: form.is_current,
      });
      toast.success(`Session "${form.name}" created`);
      setShowForm(false);
      setForm(blankSession);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to create session");
    }
    setSaving(false);
  };

  const deleteSession = async (session: AcSession) => {
    if (!confirm(`Delete session "${session.name}" and all its terms? This cannot be undone.`)) return;
    setDeletingSession(session.id);
    try {
      await api.delete(`/api/v1/academic/sessions/${session.id}`);
      toast.success("Session deleted");
      setExpanded(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to delete session"); }
    setDeletingSession(null);
  };

  const setCurrentSession = async (id: number) => {
    try {
      await api.patch(`/api/v1/academic/sessions/${id}/set-current`);
      toast.success("Current session updated");
      load();
    } catch { toast.error("Failed to update current session"); }
  };

  const setCurrentTerm = async (term: Term) => {
    try {
      await api.patch(`/api/v1/academic/terms/${term.id}/set-current`);
      toast.success(`${term.name} set as current term`);
      load();
    } catch { toast.error("Failed to update current term"); }
  };

  const addTerm = async (sessionId: number) => {
    if (!termForm.name || !termForm.start_date || !termForm.end_date) {
      toast.error("Fill all term fields"); return;
    }
    if (termForm.start_date >= termForm.end_date) {
      toast.error("End date must be after start date"); return;
    }
    setTermSaving(true);
    try {
      await api.post("/api/v1/academic/terms", {
        name: termForm.name, session_id: sessionId,
        start_date: termForm.start_date, end_date: termForm.end_date, is_current: false,
      });
      toast.success("Term added");
      setAddingTermFor(null);
      setTermForm(blankTerm);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to add term");
    }
    setTermSaving(false);
  };

  const startEditTerm = (term: Term) => {
    setEditingTerm(term);
    setEditForm({ name: term.name, start_date: term.start_date, end_date: term.end_date });
  };

  const saveTerm = async () => {
    if (!editingTerm) return;
    if (!editForm.name || !editForm.start_date || !editForm.end_date) {
      toast.error("Fill all fields"); return;
    }
    if (editForm.start_date >= editForm.end_date) {
      toast.error("End date must be after start date"); return;
    }
    setEditSaving(true);
    try {
      await api.put(`/api/v1/academic/terms/${editingTerm.id}`, editForm);
      toast.success("Term updated");
      setEditingTerm(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update term");
    }
    setEditSaving(false);
  };

  const deleteTerm = async (term: Term) => {
    if (!confirm(`Delete "${term.name}"? This cannot be undone.`)) return;
    setDeletingTerm(term.id);
    try {
      await api.delete(`/api/v1/academic/terms/${term.id}`);
      toast.success("Term deleted");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to delete term");
    }
    setDeletingTerm(null);
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Academic Sessions</h1>
          <p className="t-page-subtitle">Manage sessions and their terms</p>
        </div>
        <button className="t-btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X size={14} /> Cancel</> : "+ New Session"}
        </button>
      </div>

      {/* Create session form */}
      {showForm && (
        <div className="t-card mb-5 animate-fade-in">
          <h2 className="font-semibold t-text-primary mb-4">New Academic Session</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="t-label">Session Name *</label>
              <input className="t-input" placeholder="e.g. 2024/2025" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label className="t-label">Start Date *</label>
              <input className="t-input" type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className="t-label">End Date *</label>
              <input className="t-input" type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
            <button className="t-btn-primary" onClick={createSession} disabled={saving}>
              {saving ? "Creating..." : "Create Session"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={e => set("is_current", e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
              />
              <span className="t-text-secondary" style={{ fontSize: "0.875rem" }}>Set as current session</span>
            </label>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="t-card flex justify-center py-12"><div className="t-spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="t-card t-empty py-14">
          <Calendar size={44} />
          <p className="font-medium">No academic sessions yet</p>
          <p className="text-xs">Create your first session to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sessions.map(session => (
            <div key={session.id} className="t-card animate-fade-in" style={{ padding: 0 }}>
              {/* Session header */}
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", cursor: "pointer",
                  borderBottom: expanded === session.id ? "1px solid var(--border)" : "none",
                }}
                onClick={() => setExpanded(expanded === session.id ? null : session.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={17} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p className="t-text-primary font-semibold">{session.name}</p>
                      {session.is_current && <span className="badge-green">Current</span>}
                    </div>
                    <p className="t-text-secondary" style={{ fontSize: "0.75rem" }}>
                      {session.start_date} → {session.end_date} &nbsp;·&nbsp; {session.terms?.length || 0} term{session.terms?.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!session.is_current && (
                    <button
                      className="t-btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "4px 12px" }}
                      onClick={e => { e.stopPropagation(); setCurrentSession(session.id); }}
                    >
                      Set Current
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteSession(session); }}
                    disabled={deletingSession === session.id}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                  >
                    <Trash2 size={12} /> {deletingSession === session.id ? "..." : "Delete"}
                  </button>
                  {expanded === session.id
                    ? <ChevronUp size={16} style={{ color: "var(--text-secondary)" }} />
                    : <ChevronDown size={16} style={{ color: "var(--text-secondary)" }} />}
                </div>
              </div>

              {/* Expanded: terms */}
              {expanded === session.id && (
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p className="t-text-secondary" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Terms
                    </p>
                    <button
                      className="t-btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "4px 12px", display: "flex", alignItems: "center", gap: 5 }}
                      onClick={() => { setAddingTermFor(session.id); setTermForm(blankTerm); setEditingTerm(null); }}
                    >
                      <Plus size={13} /> Add Term
                    </button>
                  </div>

                  {/* Add term inline form */}
                  {addingTermFor === session.id && (
                    <div style={{ background: "var(--bg-page)", border: "1px solid var(--accent)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                      <p className="t-text-primary font-semibold" style={{ fontSize: "0.8125rem", marginBottom: 10 }}>New Term</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="t-label">Term Name *</label>
                          <input
                            className="t-input"
                            placeholder="e.g. First Term"
                            value={termForm.name}
                            onChange={e => setTermForm(p => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="t-label">Start Date *</label>
                          <input
                            className="t-input" type="date"
                            value={termForm.start_date}
                            onChange={e => setTermForm(p => ({ ...p, start_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="t-label">End Date *</label>
                          <input
                            className="t-input" type="date"
                            value={termForm.end_date}
                            onChange={e => setTermForm(p => ({ ...p, end_date: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="t-btn-primary" style={{ fontSize: "0.75rem", padding: "5px 14px" }} onClick={() => addTerm(session.id)} disabled={termSaving}>
                          {termSaving ? "Saving..." : "Save Term"}
                        </button>
                        <button className="t-btn-secondary" style={{ fontSize: "0.75rem", padding: "5px 14px" }} onClick={() => setAddingTermFor(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Terms list */}
                  {(!session.terms || session.terms.length === 0) ? (
                    <p className="t-text-secondary" style={{ fontSize: "0.875rem" }}>No terms yet — click "Add Term" above.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {session.terms.map(term => (
                        <div key={term.id}>
                          {editingTerm?.id === term.id ? (
                            /* Edit mode */
                            <div style={{ background: "var(--bg-page)", border: "1px solid var(--accent)", borderRadius: 8, padding: "12px 14px" }}>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="t-label">Term Name *</label>
                                  <input className="t-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="t-label">Start Date *</label>
                                  <input className="t-input" type="date" value={editForm.start_date} onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="t-label">End Date *</label>
                                  <input className="t-input" type="date" value={editForm.end_date} onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value }))} />
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button className="t-btn-primary" style={{ fontSize: "0.75rem", padding: "5px 14px" }} onClick={saveTerm} disabled={editSaving}>
                                  {editSaving ? "Saving..." : "Save Changes"}
                                </button>
                                <button className="t-btn-secondary" style={{ fontSize: "0.75rem", padding: "5px 14px" }} onClick={() => setEditingTerm(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Normal row */
                            <div style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 14px", borderRadius: 8, background: "var(--bg-page)",
                              border: `1px solid ${term.is_current ? "var(--accent)" : "var(--border)"}`,
                              flexWrap: "wrap", gap: 8,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="t-text-primary font-semibold" style={{ fontSize: "0.875rem" }}>{term.name}</span>
                                <span className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>
                                  {term.start_date} → {term.end_date}
                                </span>
                                {term.is_current && <span className="badge-green">Current</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {!term.is_current && (
                                  <button
                                    className="t-btn-secondary"
                                    style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                                    onClick={() => setCurrentTerm(term)}
                                  >
                                    Set Current
                                  </button>
                                )}
                                <button
                                  onClick={() => { startEditTerm(term); setAddingTermFor(null); }}
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => deleteTerm(term)}
                                  disabled={deletingTerm === term.id}
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                                >
                                  <Trash2 size={12} /> {deletingTerm === term.id ? "..." : "Delete"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
