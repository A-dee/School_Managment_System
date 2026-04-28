"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStudents, getClasses } from "@/lib/api";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Search, GraduationCap, Trash2, FileText } from "lucide-react";
import StudentRegistrationModal from "@/components/StudentRegistrationModal";
import { getRole } from "@/lib/auth";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [modal, setModal] = useState<{ open: boolean; studentId: number | null }>({ open: false, studentId: null });
  const [myClassId, setMyClassId] = useState<number | null>(null);
  const [scholarshipModal, setScholarshipModal] = useState<any | null>(null);
  const [scholarshipPct, setScholarshipPct] = useState(0);
  const [savingScholarship, setSavingScholarship] = useState(false);
  const limit = 20;
  const role = getRole();
  const isTeacher = role === "TEACHER";

  const load = async () => {
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
  };

  useEffect(() => { load(); }, [page, search, statusFilter]);
  useEffect(() => {
    getClasses({ limit: 500 }).then(r => {
      const allClasses = r.data.data || [];
      setClasses(allClasses);
      if (isTeacher) {
        // find the class this teacher is assigned to via staff profile
        api.get("/api/v1/auth/me").then(me => {
          const userId = me.data.data?.id;
          const myClass = allClasses.find((c: any) => c.class_teacher?.user_id === userId || c.class_teacher_id);
          // fetch staff to match user_id → staff.id → class.class_teacher_id
          api.get("/api/v1/staff/").then(staffRes => {
            const staffList = staffRes.data.data || [];
            const myStaff = staffList.find((s: any) => s.user_id === userId);
            if (myStaff) {
              const mc = allClasses.find((c: any) => c.class_teacher_id === myStaff.id);
              if (mc) setMyClassId(mc.id);
            }
          }).catch(() => {});
        }).catch(() => {});
      }
    }).catch(() => {});
    api.get("/api/v1/academic/sessions?limit=100").then(r => setSessions(r.data.data || [])).catch(() => {});
  }, []);

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
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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

      <div className="t-card overflow-x-auto">
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
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 14, width: "100%", maxWidth: 380, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 4 }}>Scholarship Exemption</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: 20 }}>
              {scholarshipModal.first_name} {scholarshipModal.last_name} · {scholarshipModal.admission_number}
            </p>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>Fee Exemption Percentage</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <button key={pct} onClick={() => setScholarshipPct(pct)} style={{
                  padding: "10px 0", borderRadius: 8, border: "2px solid",
                  borderColor: scholarshipPct === pct ? "var(--accent)" : "var(--border)",
                  background: scholarshipPct === pct ? "var(--accent)" : "transparent",
                  color: scholarshipPct === pct ? "var(--btn-primary-text)" : "var(--text-primary)",
                  fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                }}>
                  {pct === 0 ? "None" : `${pct}%`}
                </button>
              ))}
            </div>
            {scholarshipPct > 0 && (
              <p style={{ fontSize: "0.78rem", color: "var(--success)", marginBottom: 16 }}>
                Student will receive {scholarshipPct}% discount on all generated invoices.
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveScholarship} disabled={savingScholarship} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", fontWeight: 700, cursor: "pointer" }}>
                {savingScholarship ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setScholarshipModal(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer" }}>
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
