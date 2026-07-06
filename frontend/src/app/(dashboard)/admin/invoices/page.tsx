"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getInvoices } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { School, Plus, X } from "lucide-react";

const fmt = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
const STATUS_BG: Record<string, string>   = { PAID: "rgba(34,197,94,0.12)",  PARTIAL: "rgba(245,158,11,0.12)",  UNPAID: "rgba(239,68,68,0.12)" };
const STATUS_CLR: Record<string, string>  = { PAID: "#16a34a",              PARTIAL: "#d97706",               UNPAID: "#dc2626" };
const TARGET_LABEL: Record<string, string> = { ALL: "All Pupils", NEW_INTAKE: "New Intake", RETURNING: "Returning Pupils" };

// School fee schedule — keyed by class name keyword (case-insensitive match)
const FEE_PRESETS: Record<string, Record<string, number>> = {
  creche:      { tuition: 20000 },
  reception:   { tuition: 46000, books: 29000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  preschool:   { tuition: 46000, books: 29000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "nursery one":  { tuition: 57000, books: 31000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "nursery 1":    { tuition: 57000, books: 31000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "nursery two":  { tuition: 61000, books: 34000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "nursery 2":    { tuition: 61000, books: 34000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade one":    { tuition: 70000, books: 41000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade 1":      { tuition: 70000, books: 41000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade two":    { tuition: 70000, books: 41000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade 2":      { tuition: 70000, books: 41000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade three":  { tuition: 73000, books: 43000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade 3":      { tuition: 73000, books: 43000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade four":   { tuition: 73000, books: 43000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade 4":      { tuition: 73000, books: 43000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade five":   { tuition: 78000, books: 45000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
  "grade 5":      { tuition: 78000, books: 45000, uniform: 12000, termly_assessment: 5000, cardigan: 10000, sportswear: 8000, maintenance: 5000, end_of_year_party: 5000, extra_curricular: 10000 },
};

function getPresetForClass(className: string): Record<string, number> | null {
  const lower = className.toLowerCase();
  for (const key of Object.keys(FEE_PRESETS)) {
    if (lower.includes(key)) return FEE_PRESETS[key];
  }
  return null;
}

const BLANK_FEES = { form: "", tuition: "", books: "", uniform: "", termly_assessment: "", cardigan: "", sportswear: "", maintenance: "", end_of_year_party: "", extra_curricular: "" };

const lbl: React.CSSProperties = { fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 };
const sel: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem" };
const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem" };

export default function InvoicesPage() {
  const [tab, setTab] = useState<"structures" | "invoices">("structures");

  // Shared reference data
  const [sessions,  setSessions]  = useState<any[]>([]);
  const [allTerms,  setAllTerms]  = useState<any[]>([]);
  const [classes,   setClasses]   = useState<any[]>([]);
  const [students,  setStudents]  = useState<any[]>([]);

  // Fee structures tab
  const [structures,    setStructures]    = useState<any[]>([]);
  const [showForm,      setShowForm]      = useState(false);
  const [editingFs,     setEditingFs]     = useState<any | null>(null);
  const [formSession,   setFormSession]   = useState("");
  const [formTerms,     setFormTerms]     = useState<any[]>([]);
  const [formTerm,      setFormTerm]      = useState("");
  const [formClass,     setFormClass]     = useState("");
  const [formTarget,    setFormTarget]    = useState("ALL");
  const [fees,          setFees]          = useState(BLANK_FEES);
  const [savingFs,      setSavingFs]      = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Invoices tab
  const [invoices,     setInvoices]     = useState<any[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [page,         setPage]         = useState(1);
  const [filterSession, setFilterSession] = useState("");
  const [filterTerm,    setFilterTerm]    = useState("");
  const [filterTerms,   setFilterTerms]   = useState<any[]>([]);
  const [filterStatus,  setFilterStatus]  = useState("");
  const limit = 20;

  /* ── Bootstrap ── */
  useEffect(() => {
    Promise.all([
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/academic/terms"),
      api.get("/api/v1/classes/"),
      api.get("/api/v1/students/?limit=1000&status=ACTIVE"),
      api.get("/api/v1/finance/fee-structures"),
    ]).then(([s, t, c, st, fs]) => {
      setSessions(s.data.data  || []);
      setAllTerms(t.data.data  || []);
      setClasses(c.data.data   || []);
      setStudents(st.data.data || []);
      setStructures(fs.data.data || []);
    }).catch(() => {});
  }, []);

  /* ── Form: session → terms ── */
  useEffect(() => {
    if (!formSession) { setFormTerms([]); setFormTerm(""); return; }
    api.get(`/api/v1/academic/terms?session_id=${formSession}`)
      .then(r => setFormTerms(r.data.data || [])).catch(() => {});
  }, [formSession]);

  /* ── Filter: session → terms ── */
  useEffect(() => {
    if (!filterSession) { setFilterTerms([]); setFilterTerm(""); return; }
    api.get(`/api/v1/academic/terms?session_id=${filterSession}`)
      .then(r => setFilterTerms(r.data.data || [])).catch(() => {});
  }, [filterSession]);

  /* ── Load invoices ── */
  const loadInvoices = async (pg = page) => {
    setLoading(true);
    try {
      const params: any = { skip: (pg - 1) * limit, limit };
      if (filterSession) params.session_id = filterSession;
      if (filterTerm)    params.term_id    = filterTerm;
      if (filterStatus)  params.status     = filterStatus;
      const res = await getInvoices(params);
      setInvoices(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { toast.error("Failed to load invoices"); }
    setLoading(false);
  };

  useEffect(() => { if (tab === "invoices") loadInvoices(); }, [tab, page, filterSession, filterTerm, filterStatus]);

  /* ── Derived maps ── */
  const studentMap  = Object.fromEntries(students.map(s  => [s.id,  s]));
  const classMap    = Object.fromEntries(classes.map(c   => [c.id,  c.name]));
  const sessionMap  = Object.fromEntries(sessions.map(s  => [s.id,  s.name]));
  const termMap     = Object.fromEntries(allTerms.map(t  => [t.id,  t.name]));

  const feeTotal = Object.values(fees).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  /* ── Apply preset when class changes ── */
  const applyPreset = (classId: string) => {
    setFormClass(classId);
    const cls = classes.find(c => String(c.id) === classId);
    if (!cls) return;
    const preset = getPresetForClass(cls.name);
    if (preset) {
      setFees({
        form:              preset.form              ? String(preset.form)              : "",
        tuition:           preset.tuition           ? String(preset.tuition)           : "",
        books:             preset.books             ? String(preset.books)             : "",
        uniform:           preset.uniform           ? String(preset.uniform)           : "",
        termly_assessment: preset.termly_assessment ? String(preset.termly_assessment) : "",
        cardigan:          preset.cardigan          ? String(preset.cardigan)          : "",
        sportswear:        preset.sportswear        ? String(preset.sportswear)        : "",
        maintenance:       preset.maintenance       ? String(preset.maintenance)       : "",
        end_of_year_party: preset.end_of_year_party ? String(preset.end_of_year_party): "",
        extra_curricular:  preset.extra_curricular  ? String(preset.extra_curricular)  : "",
      });
    }
  };

  /* ── Open edit form ── */
  const openEdit = (fs: any) => {
    setEditingFs(fs);
    setFormClass(String(fs.class_id));
    setFormSession(String(fs.session_id));
    setFormTerm(String(fs.term_id));
    setFormTarget(fs.target_group || "ALL");
    const bd = fs.fee_breakdown || {};
    setFees({
      form:              bd.form              ? String(bd.form)              : "",
      tuition:           bd.tuition           ? String(bd.tuition)           : "",
      books:             bd.books             ? String(bd.books)             : "",
      uniform:           bd.uniform           ? String(bd.uniform)           : "",
      termly_assessment: bd.termly_assessment ? String(bd.termly_assessment) : "",
      cardigan:          bd.cardigan          ? String(bd.cardigan)          : "",
      sportswear:        bd.sportswear        ? String(bd.sportswear)        : "",
      maintenance:       bd.maintenance       ? String(bd.maintenance)       : "",
      end_of_year_party: bd.end_of_year_party ? String(bd.end_of_year_party): "",
      extra_curricular:  bd.extra_curricular  ? String(bd.extra_curricular)  : "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false); setEditingFs(null);
    setFees(BLANK_FEES); setFormClass(""); setFormSession(""); setFormTerm(""); setFormTarget("ALL");
  };

  /* ── Save fee structure (create or update) ── */
  const saveStructure = async () => {
    if (!formClass || !formSession || !formTerm || feeTotal <= 0) {
      toast.error("Fill in class, session, term, and at least one fee amount");
      return;
    }
    setSavingFs(true);
    try {
      const breakdown: Record<string, number> = {};
      (Object.keys(fees) as (keyof typeof fees)[]).forEach(k => {
        if (fees[k]) breakdown[k] = parseFloat(fees[k]);
      });
      const payload = {
        class_id: Number(formClass), session_id: Number(formSession), term_id: Number(formTerm),
        target_group: formTarget,
        fee_breakdown: breakdown, total_fee: feeTotal,
      };
      if (editingFs) {
        await api.put(`/api/v1/finance/fee-structures/${editingFs.id}`, payload);
        toast.success("Fee structure updated");
      } else {
        await api.post("/api/v1/finance/fee-structures", payload);
        toast.success("Fee structure saved");
      }
      resetForm();
      const r = await api.get("/api/v1/finance/fee-structures");
      setStructures(r.data.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    }
    setSavingFs(false);
  };

  /* ── Delete fee structure ── */
  const deleteStructure = async (id: number) => {
    if (!confirm("Delete this fee structure? Existing invoices are not affected.")) return;
    try {
      await api.delete(`/api/v1/finance/fee-structures/${id}`);
      setStructures(p => p.filter(s => s.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  /* ── Generate invoices from a fee structure ── */
  const generateFor = async (sessionId: number, termId: number) => {
    const key = `${sessionId}-${termId}`;
    setGeneratingFor(key);
    try {
      const res = await api.post("/api/v1/finance/invoices/generate", { session_id: sessionId, term_id: termId });
      const count = res.data.data?.generated ?? 0;
      toast.success(count > 0 ? `${count} invoices generated` : "No new invoices (all students already have invoices for this term)");
      if (tab === "invoices") loadInvoices();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to generate");
    }
    setGeneratingFor(null);
  };

  const paid    = invoices.filter(i => i.status === "PAID").length;
  const partial = invoices.filter(i => i.status === "PARTIAL").length;
  const unpaid  = invoices.filter(i => i.status === "UNPAID").length;
  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 18 }}>
        <h1 className="t-text-primary" style={{ fontSize: "1.25rem", fontWeight: 700 }}>Invoices & Fee Structures</h1>
        <p className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>Set up fee templates per class, then generate student invoices</p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {(["structures", "invoices"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "9px 20px", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
              background: "transparent", marginBottom: -1,
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t ? "var(--accent)" : "var(--text-secondary)",
              transition: "color 0.15s",
            }}
          >
            {t === "structures" ? "① Fee Structures" : "② Invoices"}
          </button>
        ))}
      </div>

      {/* ════════════════ FEE STRUCTURES TAB ════════════════ */}
      {tab === "structures" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <p className="t-text-secondary" style={{ fontSize: "0.8125rem", maxWidth: 500 }}>
              Create one fee structure per class/session/term combination, then click <b>Generate Invoices</b> to auto-create invoices for every student in that class.
            </p>
            <button
              onClick={() => showForm ? resetForm() : setShowForm(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
                border: "none", background: "var(--accent)", color: "var(--btn-primary-text)",
                fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer",
              }}
            >
              {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Fee Structure</>}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="t-card" style={{ marginBottom: 18 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 14 }}>
                {editingFs ? "Edit Fee Structure" : "New Fee Structure"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Class *</label>
                  <select value={formClass} onChange={e => applyPreset(e.target.value)} style={sel}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {formClass && getPresetForClass(classes.find(c => String(c.id) === formClass)?.name || "") && (
                    <p style={{ fontSize: "0.68rem", color: "#16a34a", marginTop: 3 }}>✓ School fee schedule loaded</p>
                  )}
                </div>
                <div>
                  <label style={lbl}>Session *</label>
                  <select value={formSession} onChange={e => setFormSession(e.target.value)} style={sel}>
                    <option value="">Select session</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Term *</label>
                  <select value={formTerm} onChange={e => setFormTerm(e.target.value)} style={sel} disabled={!formSession}>
                    <option value="">Select term</option>
                    {formTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Target Group *</label>
                  <select value={formTarget} onChange={e => setFormTarget(e.target.value)} style={sel}>
                    <option value="ALL">All Pupils</option>
                    <option value="NEW_INTAKE">New Intake</option>
                    <option value="RETURNING">Returning Pupils</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>Fee Breakdown (₦) — leave blank items you don't charge</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                {([
                  ["form",             "Form"],
                  ["tuition",          "Tuition"],
                  ["books",            "Books"],
                  ["uniform",          "Uniform"],
                  ["termly_assessment","Termly Assessment"],
                  ["cardigan",         "Cardigan"],
                  ["sportswear",       "Sportswear"],
                  ["maintenance",      "Maintenance"],
                  ["end_of_year_party","End of Year Party"],
                  ["extra_curricular", "Extra Curricular"],
                ] as [keyof typeof fees, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input
                      type="number" min={0} step="any" placeholder="0"
                      value={fees[key]}
                      onChange={e => setFees(p => ({ ...p, [key]: e.target.value }))}
                      style={inp}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ padding: "8px 16px", borderRadius: 8, background: "var(--accent-light)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total Fee: </span>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{fmt(feeTotal)}</span>
                </div>
                <button
                  onClick={saveStructure} disabled={savingFs}
                  style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", opacity: savingFs ? 0.6 : 1 }}
                >
                  {savingFs ? "Saving…" : (editingFs ? "Update Fee Structure" : "Save Fee Structure")}
                </button>
              </div>
            </div>
          )}

          {/* Structures list */}
          <div className="t-card">
            {structures.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
                <School size={40} style={{ opacity: 0.18, margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>No fee structures yet</p>
                <p style={{ fontSize: "0.8rem", marginTop: 4 }}>Add a fee structure above, then click Generate Invoices to create invoices for students.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Class", "Session", "Term", "Target", "Total Fee", "Breakdown", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {structures.map((fs: any) => (
                    <tr key={fs.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--text-primary)" }}>{classMap[fs.class_id] ?? `Class #${fs.class_id}`}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)" }}>{sessionMap[fs.session_id] ?? `#${fs.session_id}`}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)" }}>{termMap[fs.term_id] ?? `#${fs.term_id}`}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{TARGET_LABEL[fs.target_group || "ALL"] || fs.target_group}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--text-primary)" }}>{fmt(fs.total_fee)}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                        {Object.entries(fs.fee_breakdown || {}).map(([k, v]: any) => `${k}: ${fmt(v)}`).join(" · ") || "—"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={() => generateFor(fs.session_id, fs.term_id)}
                            disabled={generatingFor === `${fs.session_id}-${fs.term_id}`}
                            style={{ padding: "4px 10px", borderRadius: 7, fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", border: "1px solid var(--accent)", background: "var(--accent-light)", color: "var(--accent)", opacity: generatingFor === `${fs.session_id}-${fs.term_id}` ? 0.6 : 1 }}
                          >
                            {generatingFor === `${fs.session_id}-${fs.term_id}` ? "…" : "⚡ Generate"}
                          </button>
                          <button
                            onClick={() => openEdit(fs)}
                            style={{ padding: "4px 10px", borderRadius: 7, fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStructure(fs.id)}
                            style={{ padding: "4px 10px", borderRadius: 7, fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ INVOICES TAB ════════════════ */}
      {tab === "invoices" && (
        <div>
          {/* Summary pills */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Fully Paid", count: paid,    bg: "rgba(34,197,94,0.1)",   clr: "#16a34a" },
              { label: "Partial",    count: partial,  bg: "rgba(245,158,11,0.1)", clr: "#d97706" },
              { label: "Unpaid",     count: unpaid,   bg: "rgba(239,68,68,0.1)",  clr: "#dc2626" },
              { label: "Total",      count: total,    bg: "var(--accent-light)",  clr: "var(--accent)" },
            ].map(({ label, count, bg, clr }) => (
              <div key={label} style={{ padding: "8px 16px", borderRadius: 9, background: bg, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{label} </span>
                <span style={{ fontWeight: 700, color: clr }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="t-card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select style={{ ...sel, minWidth: 150, width: "auto" }} value={filterSession} onChange={e => { setFilterSession(e.target.value); setFilterTerm(""); setPage(1); }}>
              <option value="">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select style={{ ...sel, minWidth: 150, width: "auto" }} value={filterTerm} onChange={e => { setFilterTerm(e.target.value); setPage(1); }} disabled={!filterSession}>
              <option value="">All Terms</option>
              {filterTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select style={{ ...sel, minWidth: 130, width: "auto" }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          {/* Table */}
          <div className="t-card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Student", "Admission No.", "Class", "Total Fee", "Paid", "Balance", "Status"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>Loading…</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                    No invoices found. Set up fee structures in the ① tab and click Generate Invoices.
                  </td></tr>
                ) : invoices.map((inv: any) => {
                  const stu = studentMap[inv.student_id];
                  return (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontSize: "0.72rem" }}>#{inv.id}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {stu ? `${stu.first_name} ${stu.last_name}` : `Student #${inv.student_id}`}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {stu?.admission_number ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{classMap[inv.class_id] ?? `#${inv.class_id}`}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>{fmt(inv.total_fee)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#22c55e" }}>{fmt(inv.paid_amount)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#ef4444" }}>{fmt(inv.balance)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                          background: STATUS_BG[inv.status] || "transparent",
                          color: STATUS_CLR[inv.status] || "var(--text-secondary)",
                        }}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Page {page} of {totalPages} ({total} total)</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="t-btn-secondary" style={{ fontSize: "0.8rem" }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button className="t-btn-secondary" style={{ fontSize: "0.8rem" }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
