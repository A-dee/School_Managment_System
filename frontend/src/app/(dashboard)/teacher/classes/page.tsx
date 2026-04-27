"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { UserPlus, Users, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import StudentRegistrationModal from "@/components/StudentRegistrationModal";

export default function TeacherClassesPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [registeringFor, setRegisteringFor] = useState<number | null>(null);
  const [expandedClass, setExpandedClass] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, sRes, cRes] = await Promise.all([
        api.get("/api/v1/subjects/assignments"),
        api.get("/api/v1/subjects/"),
        api.get("/api/v1/classes/?limit=200"),
      ]);
      const asgn: any[] = aRes.data.data || [];
      const subj: any[] = sRes.data.data || [];
      const cls: any[] = cRes.data.data || [];
      setAssignments(asgn);
      setSubjects(subj);
      setClasses(cls);

      const classIds = [...new Set(asgn.map((a: any) => a.class_id))] as number[];
      const studentMap: Record<number, any[]> = {};
      await Promise.all(classIds.map(async (cid: number) => {
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

  const classGroups: Record<number, any[]> = {};
  for (const a of assignments) {
    if (!classGroups[a.class_id]) classGroups[a.class_id] = [];
    classGroups[a.class_id].push(a);
  }

  const reloadClassStudents = async (classId: number) => {
    const r = await api.get(`/api/v1/students/?class_id=${classId}&limit=200`);
    setStudents(p => ({ ...p, [classId]: r.data.data || [] }));
  };

  const toggleRegister = (classId: number) => {
    setRegisteringFor(registeringFor === classId ? null : classId);
  };

  const toggleExpand = (classId: number) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

  const classIds = Object.keys(classGroups);

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">My Classes</h1>
          <p className="t-page-subtitle">{classIds.length} assigned class{classIds.length !== 1 ? "es" : ""}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="t-spinner" /></div>
      ) : classIds.length === 0 ? (
        <div className="t-card text-center py-12">
          <div className="text-3xl mb-3">🏫</div>
          <p className="t-text-secondary">No classes assigned yet.</p>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 4 }}>Ask the principal to assign you to classes and subjects.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {classIds.map((classIdStr) => {
            const classId = Number(classIdStr);
            const classAssignments = classGroups[classId];
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
                      {classAssignments.map((a: any) => (
                        <span key={a.id} style={{ background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.72rem", fontWeight: 600, padding: "3px 9px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <BookOpen size={10} />
                          {getSubject(a.subject_id)?.name || `Subject #${a.subject_id}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleExpand(classId)}
                      className="t-btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <Users size={13} />
                      Students
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => setRegisteringFor(classId)}
                      className="t-btn-primary"
                      style={{ fontSize: "0.75rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <UserPlus size={12} /> Register Student
                    </button>
                  </div>
                </div>


                {isExpanded && (
                  <div style={{ marginTop: 16 }}>
                    {classStudents.length === 0 ? (
                      <p className="t-text-secondary" style={{ fontSize: "0.8125rem", textAlign: "center", padding: "20px 0" }}>
                        No students enrolled yet. Use "Register Student" to add students.
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

      {registeringFor !== null && (
        <StudentRegistrationModal
          classId={registeringFor}
          classes={classes}
          onClose={() => setRegisteringFor(null)}
          onSuccess={async () => {
            await reloadClassStudents(registeringFor!);
            setExpandedClass(registeringFor);
            setRegisteringFor(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
