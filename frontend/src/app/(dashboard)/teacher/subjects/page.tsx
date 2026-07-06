"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { BookOpen, PlusCircle, X } from "lucide-react";

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [name, setName]             = useState("");
  const [code, setCode]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/subjects/");
      setSubjects(r.data.data || []);
    } catch { toast.error("Failed to load subjects"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/v1/subjects/", { name: name.trim(), code: code.trim().toUpperCase() });
      toast.success("Subject submitted — pending principal approval");
      setName(""); setCode(""); setShowForm(false);
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to submit subject"); }
    setSubmitting(false);
  };

  const statusBadge = (s: string) =>
    s === "APPROVED" ? "badge-green" : s === "REJECTED" ? "badge-red" : "badge-yellow";

  const statusLabel = (s: string) =>
    s === "APPROVED" ? "Approved" : s === "REJECTED" ? "Rejected" : "Pending Approval";

  const mySubjects  = subjects.filter(s => s.created_by_teacher_id !== null);
  const allApproved = subjects.filter(s => s.status === "APPROVED");

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Subjects</h1>
          <p className="t-page-subtitle">Submit new subjects for principal approval, or view all approved subjects</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem" }}
        >
          {showForm ? <><X size={14} /> Cancel</> : <><PlusCircle size={14} /> Submit New Subject</>}
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="t-card mb-4" style={{ border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", marginBottom: 4 }}>New Subject</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Submitted subjects will appear as <span className="badge-yellow">Pending</span> until the principal approves them.
            Once approved, you can add them to your class in <strong>Results → My Subjects</strong>.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12, marginBottom: 16 }}>
            <div>
              <label className="t-label">Subject Name *</label>
              <input
                className="t-input"
                placeholder="e.g. Mathematics"
                value={name}
                onChange={e => setName(e.target.value)}
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
              />
            </div>
          </div>
          <button
            onClick={submit}
            disabled={submitting || !name.trim() || !code.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 24px", borderRadius: 9, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem" }}
          >
            <PlusCircle size={14} />{submitting ? "Submitting…" : "Submit for Approval"}
          </button>
        </div>
      )}

      {/* Approved subjects */}
      <div className="t-card mb-4">
        <h2 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>
          Approved Subjects ({allApproved.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="t-spinner" /></div>
        ) : allApproved.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
            No approved subjects yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allApproved.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 9, background: "var(--bg-main)", border: "1px solid var(--border)" }}>
                <BookOpen size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{s.name}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{s.code}</span>
                <span className="badge-green" style={{ fontSize: "0.65rem" }}>Approved</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All subjects table */}
      <div className="t-card overflow-x-auto">
        <h2 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>
          All Subjects ({subjects.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="t-spinner" /></div>
        ) : subjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
            No subjects yet. Submit one above.
          </div>
        ) : (
          <table className="t-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Submitted By</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{s.code}</td>
                  <td><span className={statusBadge(s.status)} style={{ fontSize: "0.72rem" }}>{statusLabel(s.status)}</span></td>
                  <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {s.created_by_teacher_id ? "Teacher" : "Admin"}
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
