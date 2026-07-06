"use client";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStudents } from "@/lib/api";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useClasses, useSessions } from "@/lib/swr-hooks";
import { Search, GraduationCap, Trash2, FileText } from "lucide-react";
import StudentRegistrationModal from "@/components/StudentRegistrationModal";
import { getRole } from "@/lib/auth";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { classes } = useClasses();
  const { sessions } = useSessions();
  const [modal, setModal] = useState<{ open: boolean; studentId: number | null }>({ open: false, studentId: null });
  const [myClassId, setMyClassId] = useState<number | null>(null);
  const [scholarshipModal, setScholarshipModal] = useState<any | null>(null);
  const [scholarshipPct, setScholarshipPct] = useState(0);
  const [savingScholarship, setSavingScholarship] = useState(false);
  const limit = 20;
  const role = getRole();
  const isTeacher = role === "TEACHER";

  // Debounce: update search (triggers fetch) 300ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { skip: (page - 1) * limit, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getStudents(params);
      setStudents(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load students");
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  /* For teachers: resolve which class they own — run once classes are loaded */
  useEffect(() => {
    if (!isTeacher || classes.length === 0) return;
    Promise.all([
      api.get("/api/v1/auth/me"),
      api.get("/api/v1/staff/"),
    ]).then(([me, staffRes]) => {
      const userId = me.data.data?.id;
      const myStaff = (staffRes.data.data || []).find((s: any) => s.user_id === userId);
      if (myStaff) {
        const mc = classes.find((c: any) => c.class_teacher_id === myStaff.id);
        if (mc) setMyClassId(mc.id);
      }
    }).catch(() => {});
  }, [isTeacher, classes]);

  const totalPages = Math.ceil(total / limit);
  const getClassName = (id: number | null) => {
    if (!id) return "—";
    const c = classes.find((c: any) => c.id === id);
    return c ? `${c.name} (${c.level})` : `Class #${id}`;
  };

  const saveScholarship = async () => {
    if (!scholarshipModal) return;
    setSavingScholarship(true);
    try {
      await api.patch(`/api/v1/students/${scholarshipModal.id}/scholarship?percentage=${scholarshipPct}`);
      toast.success("Scholarship updated");
      setScholarshipModal(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSavingScholarship(false);
  };

  const deleteStudent = async (s: any) => {
    if (!confirm(`Delete ${s.first_name} ${s.last_name} (${s.admission_number})? This cannot be undone.`)) return;
    setDeleting(s.id);
    try {
      await api.delete(`/api/v1/students/${s.id}`);
      toast.success("Student deleted");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to delete"); }
    setDeleting(null);
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Students</h1>
          <p className="t-page-subtitle">{total} total enrolled students</p>
        </div>
        <button className="t-btn-primary" onClick={() => setModal({ open: true, studentId: null })}>
          + Enrol Student
        </button>
      </div>

      {/* Filters */}
      <div className="t-card mb-4 flex gap-3 flex-wrap items-center" style={{ padding: "14px 20px" }}>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input
            className="t-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search name or admission no..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="t-input"
          style={{ width: 150 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="GRADUATED">Graduated</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      <div className="t-card">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="t-table">
            <thead>
              <tr>
                <th>Admission No</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Class</th>
                <th>Guardian</th>
                <th>Status</th>
                {!isTeacher && <th>Scholarship</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="flex justify-center py-12"><div className="t-spinner" /></div></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="t-empty">
                    <GraduationCap size={40} />
                    <p>No students found.</p>
                    {(search || statusFilter) && <p className="text-xs">Try adjusting your filters.</p>}
                  </div>
                </td></tr>
              ) : students.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }} className="t-text-secondary">{s.admission_number}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-light)", color: "var(--accent-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <span className="t-text-primary font-medium">{s.first_name} {s.last_name}</span>
                    </div>
                  </td>
                  <td className="t-text-secondary">{s.gender}</td>
                  <td className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{getClassName(s.current_class_id)}</td>
                  <td className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{s.guardian_name || "—"}</td>
                  <td><span className={s.status === "ACTIVE" ? "badge-green" : s.status === "GRADUATED" ? "badge-blue" : "badge-red"}>{s.status}</span></td>
                  {!isTeacher && (
                    <td>
                      <button
                        onClick={() => { setScholarshipModal(s); setScholarshipPct(s.scholarship_percentage || 0); }}
                        style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: (s.scholarship_percentage || 0) > 0 ? "var(--badge-success-bg)" : "var(--accent-light)", color: (s.scholarship_percentage || 0) > 0 ? "var(--badge-success-text)" : "var(--accent)", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        {(s.scholarship_percentage || 0) > 0 ? `${s.scholarship_percentage}% Off` : "Set"}
                      </button>
                    </td>
                  )}
                  <td>
                    {!isTeacher && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setModal({ open: true, studentId: s.id })}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                        >
                          <FileText size={11} /> View
                        </button>
                        <button
                          onClick={() => deleteStudent(s)}
                          disabled={deleting === s.id}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                        >
                          <Trash2 size={11} /> {deleting === s.id ? "..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p className="t-text-secondary" style={{ fontSize: "0.875rem" }}>Page {page} of {totalPages} &mdash; {total} students</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="t-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="t-btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {scholarshipModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="t-glass w-full max-w-[380px] max-h-[85vh] overflow-y-auto p-6 md:p-8 relative">
            <h2 className="font-bold text-base t-text-primary mb-1">Scholarship Exemption</h2>
            <p className="text-xs t-text-secondary mb-5">
              {scholarshipModal.first_name} {scholarshipModal.last_name} · {scholarshipModal.admission_number}
            </p>
            <p className="text-xs font-semibold t-text-secondary mb-2.5">Fee Exemption Percentage</p>
            <div className="scholarship-pct-grid grid grid-cols-5 gap-2 mb-6">
              {[0, 25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => setScholarshipPct(pct)}
                  className={`py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                    scholarshipPct === pct
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--btn-primary-text)]"
                      : "border-[var(--border)] bg-transparent t-text-primary hover:border-[var(--accent)]"
                  }`}
                >
                  {pct === 0 ? "None" : `${pct}%`}
                </button>
              ))}
            </div>
            {scholarshipPct > 0 && (
              <p className="text-xs text-[var(--success)] mb-4">
                Student will receive {scholarshipPct}% discount on all generated invoices.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={saveScholarship}
                disabled={savingScholarship}
                className="t-btn-primary flex-1 justify-center py-2.5"
              >
                {savingScholarship ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setScholarshipModal(null)}
                className="t-btn-secondary flex-1 justify-center py-2.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.open && (
        <StudentRegistrationModal
          studentId={modal.studentId}
          classes={isTeacher && myClassId ? classes.filter((c: any) => c.id === myClassId) : classes}
          sessions={sessions}
          teacherMode={isTeacher}
          onClose={() => setModal({ open: false, studentId: null })}
          onSuccess={load}
        />
      )}
    </DashboardLayout>
  );
}
