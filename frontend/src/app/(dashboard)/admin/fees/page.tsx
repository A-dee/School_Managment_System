"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Search, CheckCircle, CreditCard, Users, DollarSign, AlertTriangle, Plus, Trash2, RefreshCw, CalendarCheck, Pencil, X } from "lucide-react";

const fmt = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

type Student = { id: number; first_name: string; last_name: string; admission_number: string; current_class_id: number | null };
type Invoice = { id: number; student_id: number; total_fee: string; paid_amount: string; balance: string; status: "PAID"|"PARTIAL"|"UNPAID"; due_date: string | null };
type Payment = { id: number; invoice_id: number; amount_paid: string; payment_method: string; receipt_number: string; payment_date: string };
type FeeStructure = { id: number; class_id: number; session_id: number; term_id: number; target_group: "ALL" | "NEW_INTAKE" | "RETURNING"; fee_breakdown: Record<string, number>; total_fee: string };

const statusColor: Record<string, { bg: string; text: string }> = {
  PAID:    { bg: "rgba(34,197,94,0.12)",  text: "#16a34a" },
  PARTIAL: { bg: "rgba(245,158,11,0.12)", text: "#d97706" },
  UNPAID:  { bg: "rgba(239,68,68,0.12)",  text: "#dc2626" },
};

const blankPayment = {
  amount_paid: "", payment_method: "cash",
  receipt_number: "", payment_date: new Date().toISOString().split("T")[0],
};

const blankItem = () => ({ name: "", amount: "" });
const feeTargetLabel: Record<string, string> = {
  ALL: "All Pupils",
  NEW_INTAKE: "New Intake",
  RETURNING: "Returning Pupils",
};

export default function FeesPage() {
  const [outerTab, setOuterTab] = useState<"fees" | "schedule">("fees");

  /* --- filter state --- */
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [classes,  setClasses]  = useState<any[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [termId,    setTermId]    = useState("");
  const [search,    setSearch]    = useState("");

  /* --- data state --- */
  const [students,   setStudents]   = useState<Student[]>([]);
  const [invoiceMap, setInvoiceMap] = useState<Record<number, Invoice>>({});
  const [loading,    setLoading]    = useState(false);

  /* --- selected student --- */
  const [selected,   setSelected]   = useState<Student | null>(null);
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [payLoading, setPayLoading] = useState(false);

  /* --- payment form (existing invoice) --- */
  const [form,    setForm]    = useState(blankPayment);
  const [saving,  setSaving]  = useState(false);
  const [showPay, setShowPay] = useState(false);

  /* --- direct payment form (no invoice yet) --- */
  const blankDirect = { total_fee: "", amount_paid: "", payment_method: "cash", receipt_number: "", payment_date: new Date().toISOString().split("T")[0] };
  const [directForm,   setDirectForm]   = useState(blankDirect);
  const [savingDirect, setSavingDirect] = useState(false);

  /* --- fee schedule state --- */
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [fsLoading,     setFsLoading]     = useState(false);
  const [showCreate,    setShowCreate]    = useState(false);
  const [fsForm, setFsForm] = useState({ class_id: "", session_id: "", term_id: "", target_group: "ALL" });
  const [fsTerms, setFsTerms] = useState<any[]>([]);
  const [items, setItems] = useState([blankItem()]);
  const [savingFs, setSavingFs] = useState(false);
  const [genSessionId, setGenSessionId] = useState("");
  const [genTermId,    setGenTermId]    = useState("");
  const [genDueDate,   setGenDueDate]   = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [genTerms,  setGenTerms]  = useState<any[]>([]);
  const [allTerms,  setAllTerms]  = useState<any[]>([]);

  /* --- edit state --- */
  const [editingFs,   setEditingFs]   = useState<FeeStructure | null>(null);
  const [editForm,    setEditForm]    = useState({ class_id: "", session_id: "", term_id: "", target_group: "ALL" });
  const [editItems,   setEditItems]   = useState([blankItem()]);
  const [editTerms,   setEditTerms]   = useState<any[]>([]);
  const [savingEdit,  setSavingEdit]  = useState(false);

  /* --- optional fees state --- */
  type OptFee = { id: number; name: string; category: string; amount: number; billing_period: string; description: string | null; is_active: boolean };
  const [optFees,      setOptFees]      = useState<OptFee[]>([]);
  const [optLoading,   setOptLoading]   = useState(false);
  const [showOptForm,  setShowOptForm]  = useState(false);
  const [optForm,      setOptForm]      = useState({ name: "", category: "Clubs", billing_period: "termly", amount: "", description: "" });
  const [savingOpt,    setSavingOpt]    = useState(false);
  const [editingOpt,   setEditingOpt]   = useState<OptFee | null>(null);
  const [editOptForm,  setEditOptForm]  = useState({ name: "", category: "Clubs", billing_period: "termly", amount: "", description: "" });

  /* In-memory terms cache — pre-populated on bootstrap, served instantly on dropdown change */
  const termsCache = useRef<Map<string, any[]>>(new Map());

  const getTerms = useCallback(async (sid: string): Promise<any[]> => {
    if (!sid) return [];
    if (termsCache.current.has(sid)) return termsCache.current.get(sid)!;
    try {
      const r = await api.get(`/api/v1/academic/terms?session_id=${sid}`);
      const data: any[] = r.data.data || [];
      termsCache.current.set(sid, data);
      return data;
    } catch { return []; }
  }, []);

  /* --- bootstrap: load sessions, classes, terms cache + fee structures --- */
  useEffect(() => {
    Promise.all([
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/classes/?limit=200"),
      api.get("/api/v1/finance/fee-structures").catch(() => ({ data: { data: [] } })),
      api.get("/api/v1/finance/optional-fees").catch(() => ({ data: { data: [] } })),
    ]).then(async ([s, c, fsRes, optRes]) => {
      const sessionList: any[] = s.data.data || [];
      setSessions(sessionList);
      setClasses(c.data.data || []);
      setFeeStructures(fsRes.data.data || []);
      setOptFees(optRes.data.data || []);
      if (sessionList.length > 0) {
        const termResults = await Promise.all(
          sessionList.map((sess: any) =>
            api.get(`/api/v1/academic/terms?session_id=${sess.id}`).catch(() => ({ data: { data: [] } }))
          )
        );
        const allT: any[] = termResults.flatMap(r => r.data.data || []);
        setAllTerms(allT);
        /* pre-populate cache so every subsequent dropdown change is instant */
        const grouped = new Map<string, any[]>();
        allT.forEach(t => {
          const key = String(t.session_id);
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(t);
        });
        termsCache.current = grouped;
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Refresh on each visit to the schedule tab (bootstrap already pre-loads on first mount)
    if (outerTab === "schedule") { loadFeeStructures(); loadOptFees(); }
  }, [outerTab]);

  /* --- load optional fees --- */
  const loadOptFees = async () => {
    setOptLoading(true);
    try { const r = await api.get("/api/v1/finance/optional-fees"); setOptFees(r.data.data || []); }
    catch { toast.error("Failed to load optional fees"); }
    setOptLoading(false);
  };

  const createOptFee = async () => {
    if (!optForm.name.trim() || !optForm.amount || Number(optForm.amount) <= 0) { toast.error("Enter name and amount"); return; }
    setSavingOpt(true);
    try {
      await api.post("/api/v1/finance/optional-fees", { name: optForm.name.trim(), category: optForm.category, amount: Number(optForm.amount), billing_period: optForm.billing_period, description: optForm.description || null });
      toast.success("Optional fee added");
      setShowOptForm(false);
      setOptForm({ name: "", category: "Clubs", billing_period: "termly", amount: "", description: "" });
      loadOptFees();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSavingOpt(false);
  };

  const saveOptEdit = async () => {
    if (!editOptForm.name.trim() || !editOptForm.amount || Number(editOptForm.amount) <= 0) { toast.error("Enter name and amount"); return; }
    setSavingOpt(true);
    try {
      await api.put(`/api/v1/finance/optional-fees/${editingOpt!.id}`, { name: editOptForm.name.trim(), category: editOptForm.category, amount: Number(editOptForm.amount), billing_period: editOptForm.billing_period, description: editOptForm.description || null });
      toast.success("Optional fee updated");
      setEditingOpt(null);
      loadOptFees();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSavingOpt(false);
  };

  const deleteOptFee = async (id: number) => {
    if (!confirm("Delete this optional fee?")) return;
    try { await api.delete(`/api/v1/finance/optional-fees/${id}`); toast.success("Deleted"); setOptFees(p => p.filter(f => f.id !== id)); }
    catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  /* --- load fee structures --- */
  const loadFeeStructures = async () => {
    setFsLoading(true);
    try {
      const r = await api.get("/api/v1/finance/fee-structures");
      setFeeStructures(r.data.data || []);
    } catch { toast.error("Failed to load fee schedules"); }
    setFsLoading(false);
  };

  /* --- create fee structure --- */
  const createFeeStructure = async () => {
    if (!fsForm.class_id || !fsForm.session_id || !fsForm.term_id) {
      toast.error("Select class, session and term"); return;
    }
    const validItems = items.filter(i => i.name.trim() && Number(i.amount) > 0);
    if (validItems.length === 0) { toast.error("Add at least one fee item"); return; }
    const breakdown: Record<string, number> = {};
    validItems.forEach(i => { breakdown[i.name.trim()] = Number(i.amount); });
    const total = validItems.reduce((s, i) => s + Number(i.amount), 0);
    setSavingFs(true);
    try {
      await api.post("/api/v1/finance/fee-structures", {
        class_id:     Number(fsForm.class_id),
        session_id:   Number(fsForm.session_id),
        term_id:      Number(fsForm.term_id),
        target_group: fsForm.target_group,
        fee_breakdown: breakdown,
        total_fee:    total,
      });
      toast.success("Fee schedule created");
      setShowCreate(false);
      setFsForm({ class_id: "", session_id: "", term_id: "", target_group: "ALL" });
      setItems([blankItem()]);
      loadFeeStructures();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to create fee schedule"); }
    setSavingFs(false);
  };

  /* --- delete fee structure --- */
  const deleteFeeStructure = async (id: number) => {
    if (!confirm("Delete this fee schedule?")) return;
    try {
      await api.delete(`/api/v1/finance/fee-structures/${id}`);
      toast.success("Fee schedule deleted");
      setFeeStructures(p => p.filter(f => f.id !== id));
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to delete"); }
  };

  /* --- open edit modal --- */
  const openEdit = (fs: FeeStructure) => {
    setEditForm({ class_id: String(fs.class_id), session_id: String(fs.session_id), term_id: String(fs.term_id), target_group: fs.target_group || "ALL" });
    const parsed = Object.entries(fs.fee_breakdown).map(([name, amount]) => ({ name, amount: String(amount) }));
    setEditItems(parsed.length > 0 ? parsed : [blankItem()]);
    setEditingFs(fs);
  };

  /* --- save edit --- */
  const saveEdit = async () => {
    if (!editForm.class_id || !editForm.session_id || !editForm.term_id) {
      toast.error("Select class, session and term"); return;
    }
    const validItems = editItems.filter(i => i.name.trim() && Number(i.amount) > 0);
    if (validItems.length === 0) { toast.error("Add at least one fee item"); return; }
    const breakdown: Record<string, number> = {};
    validItems.forEach(i => { breakdown[i.name.trim()] = Number(i.amount); });
    const total = validItems.reduce((s, i) => s + Number(i.amount), 0);
    setSavingEdit(true);
    try {
      await api.put(`/api/v1/finance/fee-structures/${editingFs!.id}`, {
        class_id:      Number(editForm.class_id),
        session_id:    Number(editForm.session_id),
        term_id:       Number(editForm.term_id),
        target_group:  editForm.target_group,
        fee_breakdown: breakdown,
        total_fee:     total,
      });
      toast.success("Fee schedule updated");
      setEditingFs(null);
      loadFeeStructures();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to update fee schedule"); }
    setSavingEdit(false);
  };

  /* --- generate invoices --- */
  const generateInvoices = async () => {
    if (!genSessionId || !genTermId) { toast.error("Select session and term"); return; }
    setGenerating(true);
    try {
      const body: any = { session_id: Number(genSessionId), term_id: Number(genTermId) };
      if (genDueDate) body.due_date = genDueDate;
      const r = await api.post("/api/v1/finance/invoices/generate", body);
      toast.success(r.data.message || "Invoices generated");
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed to generate invoices"); }
    setGenerating(false);
  };

  /* --- load students + invoices for term --- */
  const load = async () => {
    setLoading(true);
    setSelected(null);
    setInvoiceMap({});
    try {
      const [studR, invR] = await Promise.all([
        api.get("/api/v1/students/?limit=500&status=ACTIVE"),
        sessionId && termId
          ? api.get(`/api/v1/finance/invoices?session_id=${sessionId}&term_id=${termId}&limit=500`)
          : Promise.resolve(null),
      ]);
      setStudents(studR.data.data || []);
      if (invR) {
        const invs: Invoice[] = invR.data.data || [];
        setInvoiceMap(Object.fromEntries(invs.map(i => [i.student_id, i])));
      }
    } catch { toast.error("Failed to load data"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  /* --- select student → load payment history --- */
  const selectStudent = async (s: Student) => {
    setSelected(s);
    setShowPay(false);
    setForm(blankPayment);
    const inv = invoiceMap[s.id];
    if (!inv) { setPayments([]); return; }
    setPayLoading(true);
    try {
      const r = await api.get(`/api/v1/finance/payments?invoice_id=${inv.id}`);
      setPayments(r.data.data || []);
    } catch { setPayments([]); }
    setPayLoading(false);
  };

  /* --- record payment --- */
  const recordPayment = async () => {
    const inv = selected ? invoiceMap[selected.id] : null;
    if (!inv) { toast.error("No invoice found for this student"); return; }
    if (!form.amount_paid || !form.receipt_number) { toast.error("Fill amount and receipt number"); return; }
    if (parseFloat(form.amount_paid) <= 0) { toast.error("Amount must be greater than 0"); return; }
    setSaving(true);
    try {
      await api.post("/api/v1/finance/payments", {
        invoice_id:     inv.id,
        amount_paid:    parseFloat(form.amount_paid),
        payment_method: form.payment_method,
        receipt_number: form.receipt_number,
        payment_date:   form.payment_date,
      });
      toast.success("Payment recorded successfully");
      setForm(blankPayment);
      setShowPay(false);
      await load();
      const r2 = await api.get(`/api/v1/finance/payments?invoice_id=${inv.id}`);
      setPayments(r2.data.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to record payment");
    }
    setSaving(false);
  };

  const reloadInvoices = async () => {
    if (!sessionId || !termId) return;
    try {
      const r = await api.get(`/api/v1/finance/invoices?session_id=${sessionId}&term_id=${termId}&limit=500`);
      const invs: Invoice[] = r.data.data || [];
      setInvoiceMap(Object.fromEntries(invs.map(i => [i.student_id, i])));
    } catch {}
  };

  const recordDirectPayment = async () => {
    if (!selected || !sessionId || !termId) return;
    if (!directForm.total_fee || !directForm.amount_paid || !directForm.receipt_number) {
      toast.error("Fill in total fee, amount paid, and receipt number"); return;
    }
    const totalFee   = parseFloat(directForm.total_fee);
    const amountPaid = parseFloat(directForm.amount_paid);
    if (isNaN(totalFee) || totalFee <= 0) { toast.error("Enter a valid total fee"); return; }
    if (isNaN(amountPaid) || amountPaid <= 0) { toast.error("Enter a valid amount paid"); return; }
    if (amountPaid > totalFee) { toast.error("Amount paid cannot exceed total fee"); return; }
    setSavingDirect(true);
    try {
      const res = await api.post("/api/v1/finance/direct-payment", {
        student_id:     selected.id,
        session_id:     Number(sessionId),
        term_id:        Number(termId),
        total_fee:      totalFee,
        amount_paid:    amountPaid,
        payment_method: directForm.payment_method,
        receipt_number: directForm.receipt_number,
        payment_date:   directForm.payment_date,
      });
      toast.success("Invoice created and payment recorded");
      setDirectForm(blankDirect);
      await reloadInvoices();
      const invoiceId = res.data.data?.invoice_id;
      if (invoiceId) {
        const r2 = await api.get(`/api/v1/finance/payments?invoice_id=${invoiceId}`);
        setPayments(r2.data.data || []);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to record payment");
    }
    setSavingDirect(false);
  };

  /* --- derived --- */
  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    return !q || s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
  });

  const classMap   = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s.name]));
  const termMap    = Object.fromEntries(
    [...allTerms, ...terms, ...fsTerms, ...genTerms].map(t => [t.id, t.name])
  );
  const inv       = selected ? invoiceMap[selected.id] : null;
  const balance   = inv ? Number(inv.balance) : 0;

  const invList     = Object.values(invoiceMap);
  const totalFees   = invList.reduce((s, i) => s + Number(i.total_fee), 0);
  const totalPaid   = invList.reduce((s, i) => s + Number(i.paid_amount), 0);
  const paidCount   = invList.filter(i => i.status === "PAID").length;
  const unpaidCount = invList.filter(i => i.status !== "PAID").length;

  const calcTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  /* ================================================================ */
  return (
    <DashboardLayout>
      {/* Outer tabs */}
      <div className="flex gap-1 p-1 bg-[var(--accent-light)] rounded-xl w-fit mb-6">
        {([
          { id: "fees",     label: "School Fees" },
          { id: "schedule", label: "Fee Schedule" },
        ] as { id: typeof outerTab; label: string }[]).map(({ id, label }) => (
          <button key={id}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-150 ${
              outerTab === id
                ? "bg-[var(--accent)] text-[var(--btn-primary-text)] shadow-sm"
                : "bg-transparent text-secondary hover:text-primary"
            }`}
            onClick={() => setOuterTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ SCHOOL FEES TAB ══════════════════ */}
      {outerTab === "fees" && (
        <>
          <div style={{ marginBottom: 18 }}>
            <h1 className="t-text-primary" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 2 }}>School Fees</h1>
            <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 14 }}>Record and track student fee payments</p>

            <div className="flex gap-3 flex-wrap items-end mb-4">
              <div className="w-full sm:w-auto">
                <p className="text-xs t-text-secondary mb-1.5">Session</p>
                <select
                  value={sessionId}
                  onChange={e => { const id = e.target.value; setSessionId(id); setTermId(""); getTerms(id).then(setTerms); }}
                  className="t-input w-full sm:w-[180px]"
                >
                  <option value="">All sessions</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <p className="text-xs t-text-secondary mb-1.5">Term</p>
                <select
                  value={termId}
                  onChange={e => setTermId(e.target.value)}
                  className="t-input w-full sm:w-[180px]"
                  disabled={!sessionId}
                >
                  <option value="">All terms</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="t-btn-primary w-full sm:w-auto justify-center py-2"
              >
                {loading ? "Loading…" : "Load"}
              </button>
            </div>
          </div>

          {invList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {[
                { icon: <DollarSign size={16} />, label: "Total Fees Due",  value: fmt(totalFees),          color: "text-[var(--accent)]" },
                { icon: <CheckCircle size={16} />,label: "Total Collected", value: fmt(totalPaid),          color: "text-[var(--success)]" },
                { icon: <AlertTriangle size={16} />,label: "Outstanding",   value: fmt(totalFees - totalPaid), color: "text-[var(--danger)]" },
                { icon: <Users size={16} />,      label: "Fully Paid",      value: paidCount,               color: "text-emerald-500" },
                { icon: <CreditCard size={16} />, label: "Still Owing",     value: unpaidCount,             color: "text-[var(--warn)]" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="t-card p-4 flex flex-col justify-between">
                  <div className={`${color} mb-2`}>{icon}</div>
                  <div>
                    <div className="text-lg font-bold t-text-primary">{value}</div>
                    <div className="text-[10px] uppercase tracking-wider t-text-secondary mt-1">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 min-h-[500px]">
            {/* Student list */}
            <div className="w-full lg:w-[280px] shrink-0 flex flex-col t-card p-0 overflow-hidden max-h-[350px] lg:max-h-none">
              <div className="p-3 border-b t-border">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-text-secondary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name or admission no…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="t-input pl-9 text-xs py-1.5"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y t-border">
                {loading ? (
                  <p className="text-center py-8 t-text-secondary text-xs">Loading…</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-center py-8 px-3 t-text-secondary text-xs">No students found</p>
                ) : filteredStudents.map(s => {
                  const studentInv = invoiceMap[s.id];
                  const st = studentInv?.status ?? null;
                  const colors = st ? statusColor[st] : null;
                  return (
                    <div
                      key={s.id}
                      onClick={() => selectStudent(s)}
                      className={`p-3 cursor-pointer border-l-4 transition-all duration-100 ${
                        selected?.id === s.id
                          ? "bg-[var(--accent-light)] border-l-[var(--accent)]"
                          : "border-l-transparent hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-xs t-text-primary">{s.first_name} {s.last_name}</div>
                          <div className="text-[10px] t-text-secondary mt-0.5">{s.admission_number}{s.current_class_id ? ` · ${classMap[s.current_class_id] ?? ""}` : ""}</div>
                        </div>
                        {colors && st && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            {st}
                          </span>
                        )}
                      </div>
                      {studentInv && (
                        <div className="mt-1">
                          <span className="text-[10px] t-text-secondary">
                            Bal: <b style={{ color: Number(studentInv.balance) > 0 ? "#ef4444" : "#22c55e" }}>{fmt(Number(studentInv.balance))}</b>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t t-border text-[10px] t-text-secondary">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Right panel */}
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 t-text-secondary t-card min-h-[300px]">
                <Users size={42} className="opacity-20" />
                <p className="text-sm">Select a student to view and record fees</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                {/* Student header */}
                <div className="t-card p-4 flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h2 className="font-bold text-base t-text-primary">{selected.first_name} {selected.last_name}</h2>
                    <p className="text-xs t-text-secondary mt-0.5">Adm: {selected.admission_number}{selected.current_class_id && ` · Class: ${classMap[selected.current_class_id] ?? ""}`}</p>
                  </div>
                  {inv ? (
                    <span className="px-3 py-1 rounded-full font-bold text-xs" style={{ background: statusColor[inv.status].bg, color: statusColor[inv.status].text }}>{inv.status}</span>
                  ) : (
                    <span className="text-xs t-text-secondary">No invoice for this term/session</span>
                  )}
                </div>

                {/* Direct payment form */}
                {!inv && sessionId && termId && (
                  <div className="t-card p-5">
                    <h3 className="font-bold text-sm t-text-primary mb-1">Record Manual Payment</h3>
                    <p className="text-xs t-text-secondary mb-4">No invoice found. An invoice will be auto-created when you record this payment.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="t-label">Total Fee (₦) *</label>
                        <input
                          type="number"
                          min={1}
                          step="any"
                          placeholder="e.g. 50000"
                          value={directForm.total_fee}
                          onChange={e => setDirectForm(p => ({ ...p, total_fee: e.target.value, amount_paid: e.target.value }))}
                          className="t-input"
                        />
                      </div>
                      <div>
                        <label className="t-label">Amount Paid (₦) *</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            step="any"
                            placeholder="0.00"
                            value={directForm.amount_paid}
                            onChange={e => setDirectForm(p => ({ ...p, amount_paid: e.target.value }))}
                            className="t-input"
                          />
                          <button onClick={() => setDirectForm(p => ({ ...p, amount_paid: p.total_fee }))} className="px-3 rounded-lg border t-border bg-transparent t-accent text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap">Full</button>
                        </div>
                      </div>
                      <div>
                        <label className="t-label">Payment Method</label>
                        <select
                          value={directForm.payment_method}
                          onChange={e => setDirectForm(p => ({ ...p, payment_method: e.target.value }))}
                          className="t-input"
                        >
                          <option value="cash">Cash</option>
                          <option value="transfer">Bank Transfer</option>
                          <option value="pos">POS</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label className="t-label">Receipt Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. RCP-001"
                          value={directForm.receipt_number}
                          onChange={e => setDirectForm(p => ({ ...p, receipt_number: e.target.value }))}
                          className="t-input"
                        />
                      </div>
                      <div>
                        <label className="t-label">Payment Date</label>
                        <input
                          type="date"
                          value={directForm.payment_date}
                          onChange={e => setDirectForm(p => ({ ...p, payment_date: e.target.value }))}
                          className="t-input"
                        />
                      </div>
                    </div>
                    <button
                      onClick={recordDirectPayment}
                      disabled={savingDirect}
                      className="t-btn-primary mt-4 justify-center py-2 w-full sm:w-auto"
                    >
                      {savingDirect ? "Recording…" : "Confirm Payment"}
                    </button>
                  </div>
                )}

                {/* Invoice breakdown */}
                {inv && (
                  <div className="t-card p-5">
                    <h3 className="font-bold text-sm mb-4 t-text-primary">Fee Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Total Fee",   value: fmt(inv.total_fee),   color: "t-text-primary" },
                        { label: "Amount Paid", value: fmt(inv.paid_amount), color: "text-[var(--success)]" },
                        { label: "Balance",     value: fmt(inv.balance),     color: balance > 0 ? "text-[var(--danger)]" : "text-[var(--success)]" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center p-3 bg-[var(--accent-light)] rounded-lg">
                          <div className={`text-base font-bold ${color}`}>{value}</div>
                          <div className="text-[10px] uppercase tracking-wider t-text-secondary mt-1">{label}</div>
                        </div>
                      ))}
                    </div>
                    {balance > 0 && (
                      <button
                        onClick={() => { setShowPay(v => !v); if (!showPay) setForm(p => ({ ...p, amount_paid: String(balance) })); }}
                        className="t-btn-primary justify-center py-2"
                      >
                        {showPay ? "Cancel" : "+ Record Payment"}
                      </button>
                    )}
                    {showPay && balance > 0 && (
                      <div className="mt-4 p-4 bg-[var(--accent-light)] rounded-lg border t-border animate-fade-in">
                        <h4 className="font-semibold text-xs mb-3 t-text-primary">Record Fee Payment</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="t-label">Amount (₦) *</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min={1}
                                max={balance}
                                step="any"
                                placeholder="0.00"
                                value={form.amount_paid}
                                onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
                                className="t-input"
                              />
                              <button onClick={() => setForm(p => ({ ...p, amount_paid: String(balance) }))} className="px-3 rounded-lg border t-border bg-transparent t-accent text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap">Full</button>
                            </div>
                            <p className="text-[10px] t-text-secondary mt-1">Balance: {fmt(balance)}</p>
                          </div>
                          <div>
                            <label className="t-label">Payment Method</label>
                            <select
                              value={form.payment_method}
                              onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                              className="t-input"
                            >
                              <option value="cash">Cash</option>
                              <option value="transfer">Bank Transfer</option>
                              <option value="pos">POS</option>
                              <option value="cheque">Cheque</option>
                            </select>
                          </div>
                          <div>
                            <label className="t-label">Receipt Number *</label>
                            <input
                              type="text"
                              placeholder="e.g. RCP-001"
                              value={form.receipt_number}
                              onChange={e => setForm(p => ({ ...p, receipt_number: e.target.value }))}
                              className="t-input"
                            />
                          </div>
                          <div>
                            <label className="t-label">Date</label>
                            <input
                              type="date"
                              value={form.payment_date}
                              onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))}
                              className="t-input"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={recordPayment}
                            disabled={saving}
                            className="t-btn-primary justify-center py-2"
                          >
                            {saving ? "Recording…" : "Confirm Payment"}
                          </button>
                          <button onClick={() => setShowPay(false)} className="t-btn-secondary justify-center py-2">Cancel</button>
                        </div>
                      </div>
                    )}
                    {balance === 0 && (
                      <p className="flex items-center gap-1.5 text-xs text-[var(--success)] mt-2">
                        <CheckCircle size={15} /> Fees fully paid — no balance outstanding
                      </p>
                    )}
                  </div>
                )}

                {/* Payment history */}
                <div className="t-card p-0 overflow-hidden flex-1 flex flex-col">
                  <div className="p-3 border-b t-border font-semibold text-xs t-text-primary">Payment History</div>
                  {payLoading ? (
                    <p className="text-center py-8 t-text-secondary text-xs">Loading…</p>
                  ) : !inv ? (
                    <p className="text-center py-8 px-3 t-text-secondary text-xs">
                      {sessionId && termId ? "No payment history yet — record a payment above." : "Select a session and term, then click Load."}
                    </p>
                  ) : payments.length === 0 ? (
                    <p className="text-center py-8 t-text-secondary text-xs">No payments recorded yet</p>
                  ) : (
                    <div className="overflow-x-auto -mx-3 px-3 sm:-mx-5 sm:px-5">
                      <table className="t-table">
                        <thead>
                          <tr>
                            {["Receipt #", "Amount", "Method", "Date"].map(h => (
                              <th key={h} className="whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }} className="t-text-secondary whitespace-nowrap">{p.receipt_number}</td>
                              <td className="font-bold text-[var(--success)] whitespace-nowrap">{fmt(Number(p.amount_paid))}</td>
                              <td className="t-text-secondary capitalize whitespace-nowrap">{p.payment_method}</td>
                              <td className="t-text-secondary whitespace-nowrap">
                                {new Date(p.payment_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[var(--accent-light)] font-bold text-xs border-t-2 t-border">
                            <td className="t-text-primary whitespace-nowrap">Total Paid</td>
                            <td className="text-[var(--success)] whitespace-nowrap">{fmt(payments.reduce((s, p) => s + Number(p.amount_paid), 0))}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════ FEE SCHEDULE TAB ══════════════════ */}
      {outerTab === "schedule" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h1 className="t-text-primary text-xl font-bold mb-0.5">Fee Schedule</h1>
              <p className="t-text-secondary text-xs">
                Set up fee structures per class/term, then generate invoices for all students.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadFeeStructures} className="t-btn-secondary py-2 px-3 text-xs flex items-center gap-1.5">
                <RefreshCw size={13} /> Refresh
              </button>
              <button onClick={() => setShowCreate(v => !v)} className="t-btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
                <Plus size={14} /> {showCreate ? "Cancel" : "New Fee Schedule"}
              </button>
            </div>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="t-card animate-fade-in p-5">
              <h3 className="font-bold text-sm t-text-primary mb-4">Create Fee Schedule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="t-label">Class *</label>
                  <select className="t-input" value={fsForm.class_id} onChange={e => setFsForm(p => ({ ...p, class_id: e.target.value }))}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="t-label">Session *</label>
                  <select className="t-input" value={fsForm.session_id} onChange={e => { const id = e.target.value; setFsForm(p => ({ ...p, session_id: id, term_id: "" })); getTerms(id).then(setFsTerms); }}>
                    <option value="">Select session</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="t-label">Term *</label>
                  <select className="t-input" value={fsForm.term_id} onChange={e => setFsForm(p => ({ ...p, term_id: e.target.value }))} disabled={!fsForm.session_id}>
                    <option value="">Select term</option>
                    {fsTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="t-label">Pupil Type *</label>
                  <select className="t-input" value={fsForm.target_group} onChange={e => setFsForm(p => ({ ...p, target_group: e.target.value }))}>
                    <option value="ALL">All Pupils</option>
                    <option value="NEW_INTAKE">New Intake</option>
                    <option value="RETURNING">Returning Pupils</option>
                  </select>
                </div>
              </div>

              {/* Fee items */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="t-label m-0">Fee Breakdown *</label>
                  <button onClick={() => setItems(p => [...p, blankItem()])} className="t-btn-secondary py-1 px-3 text-xs flex items-center gap-1">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" placeholder="Fee name (e.g. Tuition)" value={item.name}
                        onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className="t-input flex-[2]" />
                      <input type="number" min={0} placeholder="Amount (₦)" value={item.amount}
                        onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                        className="t-input flex-1" />
                      {items.length > 1 && (
                        <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="p-2 rounded-lg bg-red-500/10 text-[var(--danger)] hover:bg-red-500/20 cursor-pointer shrink-0 border-none">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {calcTotal > 0 && (
                  <p className="mt-3 text-xs font-bold t-text-primary">
                    Total: <span className="t-accent">{fmt(calcTotal)}</span>
                  </p>
                )}
              </div>
              <button onClick={createFeeStructure} disabled={savingFs} className="t-btn-primary justify-center py-2.5 w-full sm:w-auto">
                {savingFs ? "Saving…" : "Create Fee Schedule"}
              </button>
            </div>
          )}

          {/* Generate Invoices box */}
          <div className="t-card p-5" style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))", borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))" }}>
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck size={18} className="t-accent" />
              <h3 className="font-bold text-sm t-text-primary">Generate Invoices</h3>
            </div>
            <p className="text-xs t-text-secondary mb-4">
              After setting up fee schedules, generate invoices for all active students in the selected term.
            </p>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="w-full sm:w-auto">
                <label className="t-label">Session *</label>
                <select value={genSessionId} onChange={e => { const id = e.target.value; setGenSessionId(id); setGenTermId(""); getTerms(id).then(setGenTerms); }} className="t-input w-full sm:w-[180px]">
                  <option value="">Select session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <label className="t-label">Term *</label>
                <select value={genTermId} onChange={e => setGenTermId(e.target.value)} className="t-input w-full sm:w-[180px]" disabled={!genSessionId}>
                  <option value="">Select term</option>
                  {genTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <label className="t-label">Due Date (optional)</label>
                <input type="date" value={genDueDate} onChange={e => setGenDueDate(e.target.value)} className="t-input w-full sm:w-[180px]" />
              </div>
              <button onClick={generateInvoices} disabled={generating || !genSessionId || !genTermId} className="t-btn-primary w-full sm:w-auto justify-center py-2.5">
                <CalendarCheck size={14} /> {generating ? "Generating…" : "Generate Invoices"}
              </button>
            </div>
          </div>

          {/* Optional Fees card */}
          <div className="t-card p-5">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm t-text-primary mb-0.5">Optional Fees</h3>
                <p className="text-xs t-text-secondary">After school lessons and club activities — students opt in individually.</p>
              </div>
              <button onClick={() => setShowOptForm(v => !v)} className="t-btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
                <Plus size={13} /> {showOptForm ? "Cancel" : "Add Fee"}
              </button>
            </div>

            {showOptForm && (
              <div className="mb-4 p-4 bg-[var(--accent-light)] rounded-lg border t-border animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="t-label">Name *</label>
                    <input type="text" placeholder="e.g. Ballet" value={optForm.name} onChange={e => setOptForm(p => ({ ...p, name: e.target.value }))} className="t-input" />
                  </div>
                  <div>
                    <label className="t-label">Category *</label>
                    <select value={optForm.category} onChange={e => setOptForm(p => ({ ...p, category: e.target.value }))} className="t-input">
                      <option value="After School">After School</option>
                      <option value="Clubs">Clubs</option>
                    </select>
                  </div>
                  <div>
                    <label className="t-label">Billing</label>
                    <select value={optForm.billing_period} onChange={e => setOptForm(p => ({ ...p, billing_period: e.target.value }))} className="t-input">
                      <option value="termly">Per Term</option>
                      <option value="monthly">Per Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="t-label">Amount (₦) *</label>
                    <input type="number" min={0} placeholder="10000" value={optForm.amount} onChange={e => setOptForm(p => ({ ...p, amount: e.target.value }))} className="t-input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="t-label">Description (optional)</label>
                    <input type="text" placeholder="Short note…" value={optForm.description} onChange={e => setOptForm(p => ({ ...p, description: e.target.value }))} className="t-input" />
                  </div>
                </div>
                <button onClick={createOptFee} disabled={savingOpt} className="t-btn-primary justify-center py-2.5 w-full sm:w-auto">
                  {savingOpt ? "Saving…" : "Add Optional Fee"}
                </button>
              </div>
            )}

            {optLoading ? (
              <p className="t-text-secondary text-xs">Loading…</p>
            ) : optFees.length === 0 ? (
              <p className="t-text-secondary text-xs">No optional fees defined yet.</p>
            ) : (
              (() => {
                const grouped: Record<string, OptFee[]> = {};
                optFees.forEach(f => { (grouped[f.category] = grouped[f.category] || []).push(f); });
                return Object.entries(grouped).map(([cat, fees]) => (
                  <div key={cat} className="mb-4 last:mb-0">
                    <p className="text-[10px] font-extrabold t-text-secondary uppercase tracking-wider mb-2">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {fees.map(f => (
                        <div key={f.id} className={`flex items-center gap-3 py-1.5 px-3 rounded-lg border t-border transition-opacity ${f.is_active ? "bg-[var(--bg-card)]" : "bg-[var(--accent-light)] opacity-60"}`}>
                          <div className="text-xs">
                            <span className="font-semibold t-text-primary">{f.name}</span>
                            <span className="ml-2 font-bold t-accent">{fmt(f.amount)}</span>
                            <span className="ml-1.5 text-[9px] t-text-secondary bg-[var(--accent-light)] px-1.5 py-0.5 rounded-full">
                              {f.billing_period === "monthly" ? "/ month" : "/ term"}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingOpt(f); setEditOptForm({ name: f.name, category: f.category, billing_period: f.billing_period, amount: String(f.amount), description: f.description || "" }); }} className="p-1 rounded bg-[var(--accent-light)] border-none t-accent cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => deleteOptFee(f.id)} className="p-1 rounded bg-red-500/10 border-none text-[var(--danger)] cursor-pointer hover:bg-red-500/20">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>

          {/* Fee structures table */}
          <div className="t-card p-0 overflow-hidden">
            <div className="p-3 border-b t-border font-semibold text-xs t-text-primary">
              Existing Fee Schedules ({feeStructures.length})
            </div>
            {fsLoading ? (
              <div className="flex justify-center py-8"><div className="t-spinner" /></div>
            ) : feeStructures.length === 0 ? (
              <div className="text-center py-8 px-3 t-text-secondary text-xs"><p>No fee schedules created yet. Create one above.</p></div>
            ) : (
              <div className="overflow-x-auto -mx-3 px-3 sm:-mx-5 sm:px-5">
                <table className="t-table">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap">Class</th>
                      <th className="whitespace-nowrap">Session</th>
                      <th className="whitespace-nowrap">Term</th>
                      <th className="whitespace-nowrap">Pupil Type</th>
                      <th className="whitespace-nowrap">Fee Breakdown</th>
                      <th className="whitespace-nowrap">Total Fee</th>
                      <th className="whitespace-nowrap" style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeStructures.map(fs => (
                      <tr key={fs.id}>
                        <td className="font-semibold t-text-primary whitespace-nowrap">{classMap[fs.class_id] ?? `Class #${fs.class_id}`}</td>
                        <td className="t-text-secondary whitespace-nowrap">{sessionMap[fs.session_id] ?? `Session #${fs.session_id}`}</td>
                        <td className="t-text-secondary whitespace-nowrap">{termMap[fs.term_id] ?? `Term #${fs.term_id}`}</td>
                        <td className="t-text-secondary whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-light)] t-accent">
                            {feeTargetLabel[fs.target_group || "ALL"]}
                          </span>
                        </td>
                        <td className="min-w-[240px]">
                          <div className="flex gap-1 overflow-x-auto whitespace-nowrap">
                            {Object.entries(fs.fee_breakdown).map(([name, amt]) => (
                              <span key={name} className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--accent-light)] t-accent">
                                {name}: {fmt(amt)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="font-bold t-accent whitespace-nowrap">{fmt(Number(fs.total_fee))}</td>
                        <td className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(fs)} className="py-1 px-2.5 rounded-lg border-none bg-[var(--accent-light)] t-accent cursor-pointer flex items-center gap-1 text-[10px] font-semibold hover:bg-black/5 dark:hover:bg-white/5">
                              <Pencil size={12} /> Edit
                            </button>
                            <button onClick={() => deleteFeeStructure(fs.id)} className="py-1 px-2 rounded-lg border-none bg-red-500/10 text-[var(--danger)] cursor-pointer flex items-center gap-1 text-[10px] font-semibold hover:bg-red-500/20">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ══════════════════ EDIT OPTIONAL FEE MODAL ══════════════════ */}
      {editingOpt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="t-glass w-full max-w-[95%] sm:max-w-[420px] mx-auto max-h-[90vh] overflow-y-auto p-5 sm:p-6 relative">
            <button onClick={() => setEditingOpt(null)} className="absolute top-4 right-4 bg-transparent border-none cursor-pointer t-text-secondary hover:t-text-primary p-1"><X size={18} /></button>
            <h3 className="font-bold text-sm t-text-primary mb-4">Edit Optional Fee</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-label">Name *</label>
                <input type="text" value={editOptForm.name} onChange={e => setEditOptForm(p => ({ ...p, name: e.target.value }))} className="t-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="t-label">Category *</label>
                  <select value={editOptForm.category} onChange={e => setEditOptForm(p => ({ ...p, category: e.target.value }))} className="t-input">
                    <option value="After School">After School</option>
                    <option value="Clubs">Clubs</option>
                  </select>
                </div>
                <div>
                  <label className="t-label">Billing</label>
                  <select value={editOptForm.billing_period} onChange={e => setEditOptForm(p => ({ ...p, billing_period: e.target.value }))} className="t-input">
                    <option value="termly">Per Term</option>
                    <option value="monthly">Per Month</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="t-label">Amount (₦) *</label>
                <input type="number" min={0} value={editOptForm.amount} onChange={e => setEditOptForm(p => ({ ...p, amount: e.target.value }))} className="t-input" />
              </div>
              <div>
                <label className="t-label">Description</label>
                <input type="text" value={editOptForm.description} onChange={e => setEditOptForm(p => ({ ...p, description: e.target.value }))} className="t-input" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveOptEdit} disabled={savingOpt} className="t-btn-primary flex-1 justify-center py-2.5">
                {savingOpt ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditingOpt(null)} className="t-btn-secondary flex-1 justify-center py-2.5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ EDIT FEE SCHEDULE MODAL ══════════════════ */}
      {editingFs && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="t-glass w-full max-w-[95%] sm:max-w-[560px] mx-auto max-h-[90vh] overflow-y-auto p-5 sm:p-6 relative">
            <button onClick={() => setEditingFs(null)} className="absolute top-4 right-4 bg-transparent border-none cursor-pointer t-text-secondary hover:t-text-primary p-1">
              <X size={18} />
            </button>
            <h3 className="font-bold text-sm t-text-primary mb-1">Edit Fee Schedule</h3>
            <p className="text-xs t-text-secondary mb-4">
              Update the fee breakdown for <b>{classMap[editingFs.class_id] ?? `Class #${editingFs.class_id}`}</b>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="t-label">Class *</label>
                <select className="t-input" value={editForm.class_id} onChange={e => setEditForm(p => ({ ...p, class_id: e.target.value }))}>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="t-label">Session *</label>
                <select className="t-input" value={editForm.session_id} onChange={e => { const id = e.target.value; setEditForm(p => ({ ...p, session_id: id, term_id: "" })); getTerms(id).then(setEditTerms); }}>
                  <option value="">Select session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="t-label">Term *</label>
                <select className="t-input" value={editForm.term_id} onChange={e => setEditForm(p => ({ ...p, term_id: e.target.value }))} disabled={!editForm.session_id}>
                  <option value="">Select term</option>
                  {editTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="t-label">Pupil Type *</label>
                <select className="t-input" value={editForm.target_group} onChange={e => setEditForm(p => ({ ...p, target_group: e.target.value }))}>
                  <option value="ALL">All Pupils</option>
                  <option value="NEW_INTAKE">New Intake</option>
                  <option value="RETURNING">Returning Pupils</option>
                </select>
              </div>
            </div>

            {/* Fee items */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="t-label m-0">Fee Breakdown *</label>
                <button onClick={() => setEditItems(p => [...p, blankItem()])} className="t-btn-secondary py-1 px-3 text-xs">
                  <Plus size={12} /> Add Item
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {editItems.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input type="text" placeholder="Fee name (e.g. Tuition)" value={item.name}
                      onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="t-input w-full sm:flex-[2]" />
                    <input type="number" min={0} placeholder="Amount (₦)" value={item.amount}
                      onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                      className="t-input w-full sm:flex-1" />
                    {editItems.length > 1 && (
                      <button onClick={() => setEditItems(p => p.filter((_, j) => j !== i))} className="p-2 rounded-lg bg-red-500/10 text-[var(--danger)] hover:bg-red-500/20 cursor-pointer shrink-0 border-none">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editItems.reduce((s, i) => s + (Number(i.amount) || 0), 0) > 0 && (
                <p className="mt-3 text-xs font-bold t-text-primary">
                  Total: <span className="t-accent">{fmt(editItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={savingEdit} className="t-btn-primary flex-1 justify-center py-2.5">
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditingFs(null)} className="t-btn-secondary flex-1 justify-center py-2.5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const selStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.8125rem", minWidth: 150,
};
const inpStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border)",
  background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.8125rem",
};
const lbl: React.CSSProperties = {
  fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3,
};
const fullBtn: React.CSSProperties = {
  padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--bg-card)", color: "var(--accent)", fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap",
};
