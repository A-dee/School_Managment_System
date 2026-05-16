"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Search, Users, Link2, Unlink, X, UserPlus, GraduationCap } from "lucide-react";

type Child = { id: number; first_name: string; last_name: string; admission_number: string; current_class_id: number | null; status: string };
type Parent = { id: number; full_name: string; email: string | null; phone: string | null; address: string | null; children: Child[] };
type Student = { id: number; first_name: string; last_name: string; admission_number: string; current_class_id: number | null };

export default function ParentsPage() {
  const [parents,  setParents]  = useState<Parent[]>([]);
  const [classes,  setClasses]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  /* link modal state */
  const [linkParent,    setLinkParent]    = useState<Parent | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [students,      setStudents]      = useState<Student[]>([]);
  const [stuLoading,    setStuLoading]    = useState(false);
  const [linking,       setLinking]       = useState(false);
  const [unlinking,     setUnlinking]     = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get("/api/v1/parents", { params: { limit: 500 } }),
        api.get("/api/v1/classes", { params: { limit: 200 } }),
      ]);
      setParents(pRes.data.data || []);
      setClasses(cRes.data.data || []);
    } catch { toast.error("Failed to load parents"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getClassName = (id: number | null) => {
    if (!id) return "—";
    const c = classes.find((c: any) => c.id === id);
    return c ? `${c.name} (${c.level})` : `Class #${id}`;
  };

  /* search students for linking */
  useEffect(() => {
    if (!studentSearch.trim()) { setStudents([]); return; }
    const t = setTimeout(async () => {
      setStuLoading(true);
      try {
        const r = await api.get(`/api/v1/students?search=${encodeURIComponent(studentSearch)}&limit=20`);
        setStudents(r.data.data || []);
      } catch {} finally { setStuLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch]);

  const linkStudent = async (student: Student) => {
    if (!linkParent) return;
    if (linkParent.children.some(c => c.id === student.id)) {
      toast.error("Already linked to this parent"); return;
    }
    setLinking(true);
    try {
      await api.post("/api/v1/parents/link-student", { parent_id: linkParent.id, student_id: student.id });
      toast.success(`${student.first_name} linked to ${linkParent.full_name}`);
      await load();
      /* refresh modal parent */
      setLinkParent(prev => prev ? { ...prev, children: [...prev.children, { ...student, status: "ACTIVE" }] } : prev);
      setStudentSearch("");
      setStudents([]);
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to link"); }
    setLinking(false);
  };

  const unlinkStudent = async (parentId: number, studentId: number, studentName: string) => {
    if (!confirm(`Unlink ${studentName} from this parent?`)) return;
    setUnlinking(studentId);
    try {
      await api.delete("/api/v1/parents/link-student", { data: { parent_id: parentId, student_id: studentId } });
      toast.success("Unlinked");
      await load();
      setLinkParent(prev => prev ? { ...prev, children: prev.children.filter(c => c.id !== studentId) } : prev);
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to unlink"); }
    setUnlinking(null);
  };

  const filtered = useMemo(() =>
    parents.filter(p =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || "").includes(search)
    ),
  [parents, search]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Parents</h1>
          <p className="t-page-subtitle">{parents.length} registered parent accounts</p>
        </div>
      </div>

      {/* Search */}
      <div className="t-card mb-4" style={{ padding: "12px 16px" }}>
        <div style={{ position: "relative", maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input
            className="t-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="t-card overflow-x-auto">
        <table className="t-table">
          <thead>
            <tr>
              <th>Parent</th>
              <th>Contact</th>
              <th>Children</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}><div className="flex justify-center py-12"><div className="t-spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="t-empty">
                  <Users size={40} />
                  <p>{search ? "No parents match your search." : "No parents registered yet."}</p>
                </div>
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                      {p.full_name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="t-text-primary font-medium" style={{ fontSize: "0.8125rem" }}>{p.full_name}</div>
                      {p.address && <div className="t-text-secondary" style={{ fontSize: "0.7rem" }}>{p.address}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: "0.78rem" }}>
                    {p.email && <div className="t-text-secondary">{p.email}</div>}
                    {p.phone && <div className="t-text-secondary">{p.phone}</div>}
                  </div>
                </td>
                <td>
                  {p.children.length === 0 ? (
                    <span className="t-text-secondary" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>No children linked</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {p.children.map(c => (
                        <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px 2px 6px", borderRadius: 20, background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.7rem", fontWeight: 600, border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                          <GraduationCap size={10} />
                          {c.first_name} {c.last_name}
                          <span style={{ opacity: 0.55, fontSize: "0.65rem" }}>· {c.admission_number}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => { setLinkParent(p); setStudentSearch(""); setStudents([]); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                  >
                    <Link2 size={12} /> Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manage Children Modal */}
      {linkParent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Manage Children</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>{linkParent.full_name}</p>
              </div>
              <button onClick={() => setLinkParent(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Current children */}
              <div>
                <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  Linked Children ({linkParent.children.length})
                </h3>
                {linkParent.children.length === 0 ? (
                  <div style={{ padding: "16px", borderRadius: 10, border: "1px dashed var(--border)", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                    No children linked yet. Search below to add.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {linkParent.children.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--bg-main)", border: "1px solid var(--border)" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.7rem", flexShrink: 0 }}>
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{c.first_name} {c.last_name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{c.admission_number} · {getClassName(c.current_class_id)}</div>
                        </div>
                        <span className={c.status === "ACTIVE" ? "badge-green" : "badge-red"} style={{ fontSize: "0.65rem" }}>{c.status}</span>
                        <button
                          onClick={() => unlinkStudent(linkParent.id, c.id, `${c.first_name} ${c.last_name}`)}
                          disabled={unlinking === c.id}
                          title="Unlink"
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, flexShrink: 0 }}
                        >
                          <Unlink size={11} />{unlinking === c.id ? "…" : "Unlink"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link new student */}
              <div>
                <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  Link Another Child
                </h3>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    className="t-input"
                    style={{ paddingLeft: 32 }}
                    placeholder="Search student by name or admission number…"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                </div>
                {stuLoading && <div className="t-text-secondary" style={{ fontSize: "0.8rem", padding: "8px 0" }}>Searching…</div>}
                {students.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {students.map(s => {
                      const alreadyLinked = linkParent.children.some(c => c.id === s.id);
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: alreadyLinked ? "rgba(34,197,94,0.06)" : "var(--bg-main)", border: `1px solid ${alreadyLinked ? "rgba(34,197,94,0.2)" : "var(--border)"}` }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.68rem", flexShrink: 0 }}>
                            {s.first_name[0]}{s.last_name[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>{s.first_name} {s.last_name}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{s.admission_number} · {getClassName(s.current_class_id)}</div>
                          </div>
                          {alreadyLinked ? (
                            <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 600 }}>✓ Linked</span>
                          ) : (
                            <button
                              onClick={() => linkStudent(s)}
                              disabled={linking}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, background: "var(--accent)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0 }}
                            >
                              <UserPlus size={12} />{linking ? "…" : "Link"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {studentSearch && !stuLoading && students.length === 0 && (
                  <div style={{ padding: "10px 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>No students found for &ldquo;{studentSearch}&rdquo;</div>
                )}
              </div>

            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button onClick={() => setLinkParent(null)} style={{ width: "100%", padding: "9px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
