"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api, { assignStudentToClass } from "@/lib/api";
import toast from "react-hot-toast";
import { UserPlus, Users, BookOpen, ChevronDown, ChevronUp, X, Search } from "lucide-react";

export default function TeacherClassesPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Record<number, any[]>>({});
  const [displayClassIds, setDisplayClassIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<number | null>(null);

  // Enrollment modal state
  const [enrollingFor, setEnrollingFor] = useState<number | null>(null);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const meRes = await api.get("/api/v1/staff/me").catch(() => ({ data: { data: null } }));
      const myStaff: any = meRes.data.data;

      const requests: Promise<any>[] = [
        api.get("/api/v1/subjects/assignments"),
        api.get("/api/v1/subjects/"),
        api.get("/api/v1/classes/?limit=200"),
      ];
      if (myStaff) {
        requests.push(api.get(`/api/v1/classes/?class_teacher_id=${myStaff.id}&limit=10`));
      }

      const settled = await Promise.allSettled(requests);
      const getValue = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? r.value.data.data || [] : [];
      const asgn: any[]        = getValue(settled[0]);
      const subj: any[]        = getValue(settled[1]);
      const cls: any[]         = getValue(settled[2]);
      const homeClasses: any[] = settled[3] ? getValue(settled[3]) : [];

      setAssignments(asgn);
      setSubjects(subj);
      setClasses(cls);

      const classIdSet = new Set<number>([
        ...asgn.map((a: any) => a.class_id),
        ...homeClasses.map((c: any) => c.id),
      ]);
      const allClassIds = [...classIdSet];
      setDisplayClassIds(allClassIds);

      const studentMap: Record<number, any[]> = {};
      await Promise.all(allClassIds.map(async (cid: number) => {
        const r = await api.get(`/api/v1/students/?class_id=${cid}&limit=200`);
        studentMap[cid] = r.data.data || [];
      }));
      setStudents(studentMap);
    } catch {
      toast.error("Failed to load class data");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getClass = (id: number) => classes.find((c: any) => c.id === id);
  const getSubject = (id: number) => subjects.find((s: any) => s.id === id);
  const classAssignments = (classId: number) => assignments.filter((a: any) => a.class_id === classId);

  const reloadClassStudents = async (classId: number) => {
    const r = await api.get(`/api/v1/students/?class_id=${classId}&limit=200`);
    setStudents(p => ({ ...p, [classId]: r.data.data || [] }));
  };

  const openEnroll = async (classId: number) => {
    setEnrollingFor(classId);
    setEnrollSearch("");
    setEnrollLoading(true);
    try {
      const r = await api.get("/api/v1/students/?limit=500&status=ACTIVE");
      const all: any[] = r.data.data || [];
      setUnassigned(all.filter((s: any) => !s.current_class_id));
    } catch {
      toast.error("Failed to load students");
    }
    setEnrollLoading(false);
  };

  const enrollStudent = async (studentId: number) => {
    if (!enrollingFor) return;
    setEnrollSubmitting(studentId);
    try {
      await assignStudentToClass(studentId, enrollingFor);
      toast.success("Student enrolled successfully");
      setUnassigned(u => u.filter(s => s.id !== studentId));
      await reloadClassStudents(enrollingFor);
      setExpandedClass(enrollingFor);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to enroll student");
    }
    setEnrollSubmitting(null);
  };

  const filteredUnassigned = unassigned.filter(s => {
    const q = enrollSearch.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">My Classes</h1>
          <p className="t-page-subtitle">{displayClassIds.length} assigned class{displayClassIds.length !== 1 ? "es" : ""}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="t-spinner" /></div>
      ) : displayClassIds.length === 0 ? (
        <div className="t-card text-center py-12">
          <div className="text-3xl mb-3">🏫</div>
          <p className="t-text-secondary">No classes assigned yet.</p>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 4 }}>Ask the principal to assign you as class teacher.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayClassIds.map((classId) => {
            const asgns = classAssignments(classId);
            const cls = getClass(classId);
            const classStudents = students[classId] || [];
            const isExpanded = expandedClass === classId;

            return (
              <div key={classId} className="t-card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h2 className="font-semibold t-text-primary" style={{ fontSize: "1.0625rem" }}>
                      {cls?.name || `Class #${classId}`}
                    </h2>
                    <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 2 }}>
                      Level: {cls?.level || "—"} &nbsp;·&nbsp; {classStudents.length} student{classStudents.length !== 1 ? "s" : ""}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {asgns.length === 0 ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                          No subjects registered yet — go to Results → My Subjects to add them.
                        </span>
                      ) : asgns.map((a: any) => (
                        <span key={a.id} style={{ background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.72rem", fontWeight: 600, padding: "3px 9px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <BookOpen size={10} />
                          {getSubject(a.subject_id)?.name || `Subject #${a.subject_id}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => setExpandedClass(expandedClass === classId ? null : classId)}
                      className="t-btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <Users size={13} />
                      Students
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => openEnroll(classId)}
                      className="t-btn-primary"
                      style={{ fontSize: "0.75rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <UserPlus size={12} /> Enroll Student
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 16 }}>
                    {classStudents.length === 0 ? (
                      <p className="t-text-secondary" style={{ fontSize: "0.8125rem", textAlign: "center", padding: "20px 0" }}>
                        No students enrolled yet. Use &ldquo;Enroll Student&rdquo; to add students.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="t-table">
                          <thead>
                            <tr>
                              <th>Admission No.</th>
                              <th>Name</th>
                              <th>Gender</th>
                              <th>Date of Birth</th>
                              <th>Guardian</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classStudents.map((s: any) => (
                              <tr key={s.id}>
                                <td className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>{s.admission_number}</td>
                                <td className="font-medium t-text-primary">{s.first_name} {s.last_name}</td>
                                <td className="t-text-secondary">{s.gender}</td>
                                <td className="t-text-secondary">{s.date_of_birth || "—"}</td>
                                <td className="t-text-secondary">{s.guardian_name || "—"}</td>
                                <td>
                                  <span className={s.status === "ACTIVE" ? "badge-green" : "badge-red"}
                                    style={{ fontSize: "0.7rem" }}>{s.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Enroll Student Modal */}
      {enrollingFor !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="t-card" style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 className="font-semibold t-text-primary" style={{ fontSize: "1rem" }}>Enroll Student</h2>
                <p className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>
                  {getClass(enrollingFor)?.name || `Class #${enrollingFor}`} — pick an unassigned student
                </p>
              </div>
              <button onClick={() => setEnrollingFor(null)} className="t-btn-secondary" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                <input
                  className="t-input"
                  style={{ paddingLeft: 32, width: "100%" }}
                  placeholder="Search by name or admission no."
                  value={enrollSearch}
                  onChange={e => setEnrollSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
              {enrollLoading ? (
                <div className="flex justify-center py-8"><div className="t-spinner" /></div>
              ) : filteredUnassigned.length === 0 ? (
                <p className="t-text-secondary" style={{ textAlign: "center", padding: "32px 0", fontSize: "0.875rem" }}>
                  {enrollSearch ? "No students match your search." : "No unassigned students found."}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {filteredUnassigned.map((s: any) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 8, background: "var(--bg-card-inner, rgba(0,0,0,0.03))", border: "1px solid var(--border)" }}>
                      <div>
                        <p className="font-medium t-text-primary" style={{ fontSize: "0.875rem" }}>
                          {s.first_name} {s.last_name}
                        </p>
                        <p className="t-text-secondary" style={{ fontSize: "0.75rem" }}>
                          {s.admission_number} &nbsp;·&nbsp; {s.gender}
                        </p>
                      </div>
                      <button
                        onClick={() => enrollStudent(s.id)}
                        disabled={enrollSubmitting === s.id}
                        className="t-btn-primary"
                        style={{ fontSize: "0.75rem", padding: "5px 14px", flexShrink: 0 }}
                      >
                        {enrollSubmitting === s.id ? "..." : "Enroll"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
