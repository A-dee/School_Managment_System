"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Search, CheckCircle, CreditCard, Users, DollarSign, AlertTriangle } from "lucide-react";

const fmt = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

type Student = { id: number; first_name: string; last_name: string; admission_number: string; current_class_id: number | null };
type Invoice = { id: number; student_id: number; total_fee: string; paid_amount: string; balance: string; status: "PAID"|"PARTIAL"|"UNPAID"; due_date: string | null };
type Payment = { id: number; invoice_id: number; amount_paid: string; payment_method: string; receipt_number: string; payment_date: string };

const statusColor: Record<string, { bg: string; text: string }> = {
  PAID:    { bg: "rgba(34,197,94,0.12)",  text: "#16a34a" },
  PARTIAL: { bg: "rgba(245,158,11,0.12)", text: "#d97706" },
  UNPAID:  { bg: "rgba(239,68,68,0.12)",  text: "#dc2626" },
};

const blankPayment = {
  amount_paid: "", payment_method: "cash",
  receipt_number: "", payment_date: new Date().toISOString().split("T")[0],
};

export default function FeesPage() {
  /* --- filter state --- */
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms,    setTerms]    = useState<any[]>([]);
  const [classes,  setClasses]  = useState<any[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [termId,    setTermId]    = useState("");
  const [search,    setSearch]    = useState("");

  /* --- data state --- */
  const [students,  setStudents]  = useState<Student[]>([]);
  const [invoiceMap, setInvoiceMap] = useState<Record<number, Invoice>>({});
  const [loading,   setLoading]   = useState(false);

  /* --- selected student --- */
  const [selected,  setSelected]  = useState<Student | null>(null);
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [payLoading, setPayLoading] = useState(false);

  /* --- payment form (existing invoice) --- */
  const [form,    setForm]    = useState(blankPayment);
  const [saving,  setSaving]  = useState(false);
  const [showPay, setShowPay] = useState(false);

  /* --- direct payment form (no invoice yet) --- */
  const blankDirect = { total_fee: "", amount_paid: "", payment_method: "cash", receipt_number: "", payment_date: new Date().toISOString().split("T")[0] };
  const [directForm,   setDirectForm]   = useState(blankDirect);
  const [savingDirect, setSavingDirect] = useState(false);

  /* --- bootstrap --- */
  useEffect(() => {
    Promise.all([
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/classes"),
    ]).then(([s, c]) => {
      setSessions(s.data.data || []);
      setClasses(c.data.data  || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) { setTerms([]); setTermId(""); return; }
    api.get(`/api/v1/academic/terms?session_id=${sessionId}`)
      .then(r => setTerms(r.data.data || [])).catch(() => {});
  }, [sessionId]);

  /* --- load students + invoices for term --- */
  const load = async () => {
    setLoading(true);
    setSelected(null);
    setInvoiceMap({});
    try {
      const [studR, invR] = await Promise.all([
        api.get("/api/v1/students?limit=500&status=ACTIVE"),
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
      /* refresh invoice map and payment history */
      await load();
      /* reload payment history for this student */
      const r2 = await api.get(`/api/v1/finance/payments?invoice_id=${inv.id}`);
      setPayments(r2.data.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to record payment");
    }
    setSaving(false);
  };

  /* --- reload only invoice map without deselecting student --- */
  const reloadInvoices = async () => {
    if (!sessionId || !termId) return;
    try {
      const r = await api.get(`/api/v1/finance/invoices?session_id=${sessionId}&term_id=${termId}&limit=500`);
      const invs: Invoice[] = r.data.data || [];
      setInvoiceMap(Object.fromEntries(invs.map(i => [i.student_id, i])));
    } catch {}
  };

  /* --- record payment when no invoice exists (auto-creates invoice) --- */
  const recordDirectPayment = async () => {
    if (!selected || !sessionId || !termId) return;
    if (!directForm.total_fee || !directForm.amount_paid || !directForm.receipt_number) {
      toast.error("Fill in total fee, amount paid, and receipt number");
      return;
    }
    const totalFee  = parseFloat(directForm.total_fee);
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
      // Refresh invoice map without deselecting
      await reloadInvoices();
      // Load payment history using returned invoice_id
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
  const inv        = selected ? invoiceMap[selected.id] : null;
  const balance    = inv ? Number(inv.balance) : 0;

  /* --- summary --- */
  const invList    = Object.values(invoiceMap);
  const totalFees  = invList.reduce((s, i) => s + Number(i.total_fee), 0);
  const totalPaid  = invList.reduce((s, i) => s + Number(i.paid_amount), 0);
  const paidCount  = invList.filter(i => i.status === "PAID").length;
  const unpaidCount= invList.filter(i => i.status !== "PAID").length;

  /* ================================================================ */
  return (
    <DashboardLayout>
      {/* Header + Filters */}
      <div style={{ marginBottom: 18 }}>
        <h1 className="t-text-primary" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 2 }}>School Fees</h1>
        <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 14 }}>
          Record and track student fee payments
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>Session</p>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={selStyle}>
              <option value="">All sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: 3 }}>Term</p>
            <select value={termId} onChange={e => setTermId(e.target.value)} style={selStyle} disabled={!sessionId}>
              <option value="">All terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button
            onClick={load} disabled={loading}
            style={{ alignSelf: "flex-end", padding: "6px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
      </div>

      {/* Summary cards (only when invoices loaded) */}
      {invList.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { icon: <DollarSign size={18} />, label: "Total Fees Due",  value: fmt(totalFees),   color: "#6366f1" },
            { icon: <CheckCircle size={18} />,label: "Total Collected", value: fmt(totalPaid),   color: "#22c55e" },
            { icon: <AlertTriangle size={18} />, label: "Outstanding",  value: fmt(totalFees - totalPaid), color: "#ef4444" },
            { icon: <Users size={18} />,      label: "Fully Paid",      value: paidCount,         color: "#10b981" },
            { icon: <CreditCard size={18} />, label: "Still Owing",     value: unpaidCount,       color: "#f59e0b" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ color, marginBottom: 5 }}>{icon}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Split view */}
      <div style={{ display: "flex", gap: 14, minHeight: 500 }}>

        {/* ---- Student list ---- */}
        <div style={{
          width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
          background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder="Search by name or admission no…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "6px 10px 6px 28px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.78rem" }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <p style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>Loading…</p>
            ) : filteredStudents.length === 0 ? (
              <p style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>No students found</p>
            ) : filteredStudents.map(s => {
              const studentInv = invoiceMap[s.id];
              const st         = studentInv?.status ?? null;
              const colors     = st ? statusColor[st] : null;
              return (
                <div
                  key={s.id}
                  onClick={() => selectStudent(s)}
                  style={{
                    padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                    background: selected?.id === s.id ? "var(--accent-light)" : "transparent",
                    borderLeft: selected?.id === s.id ? "3px solid var(--accent)" : "3px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                        {s.first_name} {s.last_name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                        {s.admission_number}{s.current_class_id ? ` · ${classMap[s.current_class_id] ?? ""}` : ""}
                      </div>
                    </div>
                    {colors && st && (
                      <span style={{
                        padding: "1px 7px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 600,
                        background: colors.bg, color: colors.text, flexShrink: 0,
                      }}>
                        {st}
                      </span>
                    )}
                  </div>
                  {studentInv && (
                    <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                        Bal: <b style={{ color: Number(studentInv.balance) > 0 ? "#ef4444" : "#22c55e" }}>
                          {fmt(Number(studentInv.balance))}
                        </b>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ---- Right panel ---- */}
        {!selected ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 8, color: "var(--text-secondary)",
            background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10,
          }}>
            <Users size={42} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: "0.875rem" }}>Select a student to view and record fees</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Student header */}
            <div style={{
              background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {selected.first_name} {selected.last_name}
                </h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  Adm: {selected.admission_number}
                  {selected.current_class_id && ` · Class: ${classMap[selected.current_class_id] ?? ""}`}
                </p>
              </div>
              {inv ? (
                <span style={{
                  padding: "4px 14px", borderRadius: 20, fontWeight: 700, fontSize: "0.8rem",
                  background: statusColor[inv.status].bg, color: statusColor[inv.status].text,
                }}>
                  {inv.status}
                </span>
              ) : (
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  No invoice for this term/session
                </span>
              )}
            </div>

            {/* Direct payment form when no invoice exists but session+term selected */}
            {!inv && sessionId && termId && (
              <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: 4 }}>Record Manual Payment</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 14 }}>
                  No invoice found for this term. An invoice will be auto-created when you record this payment.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Total Fee (₦) *</label>
                    <input type="number" min={1} step="any" placeholder="e.g. 50000"
                      value={directForm.total_fee}
                      onChange={e => setDirectForm(p => ({ ...p, total_fee: e.target.value, amount_paid: e.target.value }))}
                      style={inpStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Amount Paid (₦) *</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" min={1} step="any" placeholder="0.00"
                        value={directForm.amount_paid}
                        onChange={e => setDirectForm(p => ({ ...p, amount_paid: e.target.value }))}
                        style={inpStyle} />
                      <button
                        onClick={() => setDirectForm(p => ({ ...p, amount_paid: p.total_fee }))}
                        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--accent)", fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap" }}
                      >Full</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Payment Method</label>
                    <select value={directForm.payment_method} onChange={e => setDirectForm(p => ({ ...p, payment_method: e.target.value }))} style={inpStyle}>
                      <option value="cash">Cash</option>
                      <option value="transfer">Bank Transfer</option>
                      <option value="pos">POS</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Receipt Number *</label>
                    <input type="text" placeholder="e.g. RCP-001"
                      value={directForm.receipt_number}
                      onChange={e => setDirectForm(p => ({ ...p, receipt_number: e.target.value }))}
                      style={inpStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Payment Date</label>
                    <input type="date" value={directForm.payment_date} onChange={e => setDirectForm(p => ({ ...p, payment_date: e.target.value }))} style={inpStyle} />
                  </div>
                </div>
                <button
                  onClick={recordDirectPayment} disabled={savingDirect}
                  style={{ marginTop: 14, padding: "7px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", opacity: savingDirect ? 0.6 : 1 }}
                >
                  {savingDirect ? "Recording…" : "Confirm Payment"}
                </button>
              </div>
            )}

            {/* Invoice breakdown */}
            {inv && (
              <div style={{
                background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px",
              }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 14, color: "var(--text-primary)" }}>
                  Fee Summary
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Total Fee",   value: fmt(inv.total_fee),   color: "var(--text-primary)" },
                    { label: "Amount Paid", value: fmt(inv.paid_amount), color: "#22c55e" },
                    { label: "Balance",     value: fmt(inv.balance),     color: balance > 0 ? "#ef4444" : "#22c55e" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center", padding: "12px 10px", background: "var(--accent-light)", borderRadius: 8 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Record payment button */}
                {balance > 0 && (
                  <button
                    onClick={() => { setShowPay(v => !v); if (!showPay) setForm(p => ({ ...p, amount_paid: String(balance) })); }}
                    style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
                  >
                    {showPay ? "Cancel" : "+ Record Payment"}
                  </button>
                )}

                {/* Payment form */}
                {showPay && balance > 0 && (
                  <div style={{ marginTop: 14, padding: 14, background: "var(--accent-light)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <h4 style={{ fontWeight: 600, fontSize: "0.8rem", marginBottom: 12, color: "var(--text-primary)" }}>Record Fee Payment</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Amount (₦) *</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="number" min={1} max={balance} step="any"
                            placeholder="0.00"
                            value={form.amount_paid}
                            onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
                            style={inpStyle}
                          />
                          <button
                            onClick={() => setForm(p => ({ ...p, amount_paid: String(balance) }))}
                            title="Pay full balance"
                            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--accent)", fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Full
                          </button>
                        </div>
                        <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 2 }}>
                          Balance: {fmt(balance)}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Payment Method</label>
                        <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))} style={inpStyle}>
                          <option value="cash">Cash</option>
                          <option value="transfer">Bank Transfer</option>
                          <option value="pos">POS</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Receipt Number *</label>
                        <input
                          type="text" placeholder="e.g. RCP-001"
                          value={form.receipt_number}
                          onChange={e => setForm(p => ({ ...p, receipt_number: e.target.value }))}
                          style={inpStyle}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Date</label>
                        <input type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} style={inpStyle} />
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <button
                        onClick={recordPayment} disabled={saving}
                        style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
                      >
                        {saving ? "Recording…" : "Confirm Payment"}
                      </button>
                      <button onClick={() => setShowPay(false)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: "0.8125rem", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {balance === 0 && (
                  <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "#22c55e", marginTop: 8 }}>
                    <CheckCircle size={15} /> Fees fully paid — no balance outstanding
                  </p>
                )}
              </div>
            )}

            {/* Payment history */}
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", flex: 1 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                Payment History
              </div>
              {payLoading ? (
                <p style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>Loading…</p>
              ) : !inv ? (
                <p style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {sessionId && termId ? "No payment history yet — record a payment above." : "Select a session and term, then click Load."}
                </p>
              ) : payments.length === 0 ? (
                <p style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>No payments recorded yet</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Receipt #", "Amount", "Method", "Date"].map(h => (
                          <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{p.receipt_number}</td>
                          <td style={{ padding: "9px 14px", fontWeight: 700, color: "#22c55e" }}>{fmt(Number(p.amount_paid))}</td>
                          <td style={{ padding: "9px 14px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.payment_method}</td>
                          <td style={{ padding: "9px 14px", color: "var(--text-secondary)" }}>
                            {new Date(p.payment_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--border)", background: "var(--accent-light)" }}>
                        <td style={{ padding: "9px 14px", fontWeight: 700, color: "var(--text-primary)", fontSize: "0.78rem" }}>Total Paid</td>
                        <td style={{ padding: "9px 14px", fontWeight: 700, color: "#22c55e" }}>
                          {fmt(payments.reduce((s, p) => s + Number(p.amount_paid), 0))}
                        </td>
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
    </DashboardLayout>
  );
}

const selStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem", minWidth: 150,
};
const inpStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem",
};
