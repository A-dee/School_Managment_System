"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { BookOpen, PlusCircle, Check, X } from "lucide-react";

export default function SubjectsPage() {
  const [subjects,    setSubjects]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [name,        setName]        = useState("");
  const [code,        setCode]        = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [actioning,   setActioning]   = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/subjects/");
      setSubjects(r.data.data || []);
    } catch { toast.error("Failed to load subjects"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createSubject = async () => {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/v1/subjects/", { name: name.trim(), code: code.trim().toUpperCase() });
      toast.success("Subject created and approved");
      setName(""); setCode(""); setShowForm(false);
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to create subject"); }
    setSubmitting(false);
  };

  const approve = async (id: number) => {
    setActioning(id);
    try { await api.put(`/api/v1/subjects/${id}/approve`); toast.success("Subject approved"); await load(); }
    catch { toast.error("Failed to approve"); }
    setActioning(null);
  };

  const reject = async (id: number) => {
    setActioning(id);
    try { await api.put(`/api/v1/subjects/${id}/reject`); toast.success("Subject rejected"); await load(); }
    catch { toast.error("Failed to reject"); }
    setActioning(null);
  };

  const pending   = subjects.filter(s => s.status === "PENDING");
  const approved  = subjects.filter(s => s.status === "APPROVED");
  const rejected  = subjects.filter(s => s.status === "REJECTED");

  const statusBadge = (s: string) =>
    s === "APPROVED" ? "badge-green" : s === "REJECTED" ? "badge-red" : "badge-yellow";

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Subjects</h1>
          <p className="t-page-subtitle">
            {approved.length} approved · {pending.length} pending · {rejected.length} rejected
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem" }}
        >
          {showForm ? <><X size={14} /> Cancel</> : <><PlusCircle size={14} /> Add Subject</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="t-card mb-4" style={{ border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", marginBottom: 4 }}>New Subject</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Subjects added here are automatically approved and available to all teachers.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12, marginBottom: 16 }}>
            <div>
              <label className="t-label">Subject Name *</label>
              <input
                className="t-input"
                placeholder="e.g. Mathematics"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createSubject()}
              />
            </div>
            <div>
              <label className="t-label">Code *</label>
              <input
                className="t-input"
                placeholder="e.g. MTH"
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ textTransform: "uppercase" }}
                onKeyDown={e => e.key === "Enter" && createSubject()}
              />
            </div>
          </div>
          <button
            onClick={createSubject}
            disabled={submitting || !name.trim() || !code.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 24px", borderRadius: 9, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem" }}
          >
            <PlusCircle size={14} />{submitting ? "Creating…" : "Create Subject"}
          </button>
        </div>
      )}

      {/* Pending approval */}
      {pending.length > 0 && (
        <div className="t-card mb-4" style={{ border: "1px solid rgba(234,179,8,0.3)" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>
            Pending Approval ({pending.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--bg-main)", border: "1px solid var(--border)" }}>
                <BookOpen size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{s.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: 8 }}>{s.code}</span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Submitted by teacher</span>
                <button
                  onClick={() => approve(s.id)}
                  disabled={actioning === s.id}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, background: "rgba(34,197,94,0.1)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                >
                  <Check size={12} />{actioning === s.id ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => reject(s.id)}
                  disabled={actioning === s.id}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                >
                  <X size={12} />{actioning === s.id ? "…" : "Reject"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All subjects table */}
      <div className="t-card overflow-x-auto">
        <h2 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>
          All Subjects ({subjects.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="t-spinner" /></div>
        ) : subjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
            <BookOpen size={40} style={{ opacity: 0.15, display: "block", margin: "0 auto 10px" }} />
            No subjects yet. Add one above.
          </div>
        ) : (
          <table className="t-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Created By</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{s.code}</td>
                  <td><span className={statusBadge(s.status)} style={{ fontSize: "0.72rem" }}>{s.status}</span></td>
                  <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {s.created_by_teacher_id ? "Teacher" : "Admin"}
                  </td>
                  <td>
                    {s.status === "PENDING" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => approve(s.id)}
                          disabled={actioning === s.id}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                        >
                          <Check size={11} />Approve
                        </button>
                        <button
                          onClick={() => reject(s.id)}
                          disabled={actioning === s.id}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                        >
                          <X size={11} />Reject
                        </button>
                      </div>
                    )}
                    {s.status === "APPROVED" && (
                      <button
                        onClick={() => reject(s.id)}
                        disabled={actioning === s.id}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                      >
                        <X size={11} />Revoke
                      </button>
                    )}
                    {s.status === "REJECTED" && (
                      <button
                        onClick={() => approve(s.id)}
                        disabled={actioning === s.id}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                      >
                        <Check size={11} />Re-approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
