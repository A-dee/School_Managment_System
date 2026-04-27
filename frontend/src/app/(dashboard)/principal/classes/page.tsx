"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getClasses, createClass, getStaff } from "@/lib/api";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Trash2, UserCheck, X, Users, ChevronDown, ChevronUp, Search, UserPlus, UserMinus } from "lucide-react";

const typeLabel: Record<string, string> = {
  TEACHER: "Teacher", ADMIN: "Principal", PRINCIPAL: "Vice Principal", NON_TEACHING: "Non-Teaching",
};

export default function ClassesPage() {
  const [classes,  setClasses]  = useState<any[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", level: "", capacity: "", session_id: "", class_teacher_id: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Teacher assign (inline)
  const [assigning,    setAssigning]    = useState<number | null>(null);
  const [assignValue,  setAssignValue]  = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  // Student panel per class
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [classStudents, setClassStudents] = useState<Record<number, any[]>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [movingStudent, setMovingStudent] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [clsRes, sesRes, staffRes, studRes] = await Promise.all([
        getClasses({ limit: 200 }),
        api.get("/api/v1/academic/sessions"),
        getStaff({ limit: 200 }),
        api.get("/api/v1/students?limit=500&status=ACTIVE"),
      ]);
      setClasses(clsRes.data.data || []);
      setTotal(clsRes.data.pagination?.total || 0);
      setSessions(sesRes.data.data || []);
      setTeachers(staffRes.data.data || []);
      setAllStudents(studRes.data.data || []);
    } catch { toast.error("Failed to load"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const staffName = (id: number | null) => {
    if (!id) return null;
    const s = teachers.find(t => t.id === id);
    return s ? `${s.full_name} (${typeLabel[s.staff_type] || s.staff_type})` : `Staff #${id}`;
  };

  const sessionName = (id: number) => sessions.find(s => s.id === id)?.name || `#${id}`;

  const studentsInClass = (classId: number) =>
    allStudents.filter(s => s.current_class_id === classId);

  const unassignedStudents = useMemo(() =>
    allStudents.filter(s => !s.current_class_id),
    [allStudents]
  );

  // ── Delete class ──
  const deleteClass = async (c: any) => {
    if (!confirm(`Delete class "${c.name}"? Students will become unassigned.`)) return;
    setDeleting(c.id);
    try {
      await api.delete(`/api/v1/classes/${c.id}`);
      toast.success("Class deleted");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setDeleting(null);
  };

  // ── Create class ──
  const save = async () => {
    if (!form.name || !form.level || !form.session_id) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await createClass({
        name: form.name, level: form.level,
        capacity: form.capacity ? Number(form.capacity) : null,
        session_id: Number(form.session_id),
        class_teacher_id: form.class_teacher_id ? Number(form.class_teacher_id) : null,
      });
      toast.success("Class created");
      setShowForm(false);
      setForm({ name: "", level: "", capacity: "", session_id: "", class_teacher_id: "" });
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  // ── Assign teacher ──
  const startAssign = (c: any) => {
    setAssigning(c.id);
    setAssignValue(c.class_teacher_id ? String(c.class_teacher_id) : "");
  };
  const saveAssign = async (classId: number) => {
    setAssignSaving(true);
    try {
      await api.put(`/api/v1/classes/${classId}`, {
        class_teacher_id: assignValue ? Number(assignValue) : null,
      });
      toast.success("Teacher assigned");
      setAssigning(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setAssignSaving(false);
  };

  // ── Assign student to class ──
  const assignStudent = async (studentId: number, classId: number) => {
    setMovingStudent(studentId);
    try {
      await api.put(`/api/v1/students/${studentId}`, { current_class_id: classId });
      toast.success("Student assigned to class");
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setMovingStudent(null);
  };

  // ── Remove student from class ──
  const removeStudent = async (studentId: number, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this class?`)) return;
    setMovingStudent(studentId);
    try {
      await api.put(`/api/v1/students/${studentId}`, { current_class_id: null });
      toast.success("Student removed from class");
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setMovingStudent(null);
  };

  const assignableStaff = teachers.filter(s =>
    ["TEACHER", "ADMIN", "PRINCIPAL"].includes(s.staff_type)
  );

  // Filtered unassigned students for search
  const filteredUnassigned = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return unassignedStudents.filter(s =>
      !q ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    );
  }, [unassignedStudents, studentSearch]);

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Classes</h1>
          <p className="t-page-subtitle">{total} classes · {allStudents.length} active students · {unassignedStudents.length} unassigned</p>
        </div>
        <button className="t-btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X size={14} /> Cancel</> : "+ Add Class"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="t-card mb-5 animate-fade-in">
          <h2 className="font-semibold t-text-primary mb-4">New Class</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="t-label">Class Name *</label>
              <input className="t-input" placeholder="e.g. JSS1A" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="t-label">Level *</label>
              <select className="t-input" value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
                <option value="">Select level</option>
                {["Nursery 1","Nursery 2","Preschool 1","Preschool 2","Kindergarten",
                  "Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6",
                  "JSS1","JSS2","JSS3","SS1","SS2","SS3"].map(l =>
                  <option key={l} value={l}>{l}</option>
                )}
              </select>
            </div>
            <div>
              <label className="t-label">Capacity</label>
              <input className="t-input" type="number" placeholder="40" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="t-label">Session *</label>
              <select className="t-input" value={form.session_id} onChange={e => setForm(p => ({ ...p, session_id: e.target.value }))}>
                <option value="">Select session</option>
                {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label">Class Teacher</label>
              <select className="t-input" value={form.class_teacher_id} onChange={e => setForm(p => ({ ...p, class_teacher_id: e.target.value }))}>
                <option value="">— None —</option>
                {assignableStaff.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({typeLabel[s.staff_type] || s.staff_type})</option>
                ))}
              </select>
            </div>
          </div>
          <button className="t-btn-primary mt-4" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Create Class"}
          </button>
        </div>
      )}

      {/* Class list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="t-spinner" /></div>
      ) : classes.length === 0 ? (
        <div className="t-card"><div className="t-empty"><p>No classes yet. Click "+ Add Class" to create one.</p></div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {classes.map((c: any) => {
            const inClass    = studentsInClass(c.id);
            const isExpanded = expandedClass === c.id;

            return (
              <div key={c.id} className="t-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Class header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}>

                  {/* Name + level */}
                  <div style={{ flex: "0 0 auto", minWidth: 110 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>{c.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{c.level}</div>
                  </div>

                  {/* Session */}
                  <div style={{ flex: "0 0 auto", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {sessionName(c.session_id)}
                  </div>

                  {/* Teacher */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {assigning === c.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          className="t-input"
                          style={{ fontSize: "0.8125rem", padding: "4px 8px", minWidth: 180 }}
                          value={assignValue}
                          onChange={e => setAssignValue(e.target.value)}
                        >
                          <option value="">— Unassign teacher —</option>
                          {assignableStaff.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.full_name} ({typeLabel[s.staff_type]})</option>
                          ))}
                        </select>
                        <button className="t-btn-primary" style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                          onClick={() => saveAssign(c.id)} disabled={assignSaving}>
                          {assignSaving ? "..." : "Save"}
                        </button>
                        <button className="t-btn-secondary" style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                          onClick={() => setAssigning(null)}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.8125rem", color: c.class_teacher_id ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {c.class_teacher_id ? staffName(c.class_teacher_id) : "No teacher assigned"}
                        </span>
                        <button onClick={() => startAssign(c)}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                          <UserCheck size={12} /> {c.class_teacher_id ? "Change" : "Assign Teacher"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right side buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                    <button
                      onClick={() => { setExpandedClass(isExpanded ? null : c.id); setStudentSearch(""); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)", background: isExpanded ? "var(--accent-light)" : "transparent", color: isExpanded ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                    >
                      <Users size={13} />
                      Students ({inClass.length}{c.capacity ? `/${c.capacity}` : ""})
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button
                      onClick={() => deleteClass(c)} disabled={deleting === c.id}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                      <Trash2 size={12} /> {deleting === c.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>

                {/* ── Expanded student panel ── */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", background: "var(--bg-page)" }}
                    className="animate-fade-in">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                      {/* Left: students in this class */}
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)", marginBottom: 10 }}>
                          Enrolled Students ({inClass.length})
                        </p>
                        {inClass.length === 0 ? (
                          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", padding: "12px 0" }}>
                            No students in this class yet.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
                            {inClass.map((s: any) => (
                              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 7, background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                                    {s.first_name} {s.last_name}
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{s.admission_number}</div>
                                </div>
                                <button
                                  onClick={() => removeStudent(s.id, `${s.first_name} ${s.last_name}`)}
                                  disabled={movingStudent === s.id}
                                  title="Remove from class"
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}
                                >
                                  <UserMinus size={11} /> {movingStudent === s.id ? "..." : "Remove"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: add unassigned students */}
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)", marginBottom: 10 }}>
                          Add Students ({unassignedStudents.length} unassigned)
                        </p>
                        <div style={{ position: "relative", marginBottom: 8 }}>
                          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                          <input
                            style={{ width: "100%", padding: "6px 10px 6px 26px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.78rem" }}
                            placeholder="Search by name or admission no…"
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                          />
                        </div>
                        {unassignedStudents.length === 0 ? (
                          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>All students are assigned to classes.</p>
                        ) : filteredUnassigned.length === 0 ? (
                          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>No matches found.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
                            {filteredUnassigned.map((s: any) => (
                              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 7, background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                                    {s.first_name} {s.last_name}
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{s.admission_number}</div>
                                </div>
                                <button
                                  onClick={() => assignStudent(s.id, c.id)}
                                  disabled={movingStudent === s.id}
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}
                                >
                                  <UserPlus size={11} /> {movingStudent === s.id ? "..." : "Add"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
