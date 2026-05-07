"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getProfitLoss } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Receipt, BarChart2, AlertTriangle, Clock, CheckCircle, XCircle, X } from "lucide-react";

const fmt = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

type Tab = "overview" | "debtors" | "declarations" | "ledger";

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("overview");

  // overview
  const [profit,  setProfit]  = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // debtors
  const [sessions,   setSessions]   = useState<any[]>([]);
  const [terms,      setTerms]      = useState<any[]>([]);
  const [sessionId,  setSessionId]  = useState("");
  const [termId,     setTermId]     = useState("");
  const [debtors,    setDebtors]    = useState<any[]>([]);
  const [debtLoading,setDebtLoading]= useState(false);
  const [students,   setStudents]   = useState<Record<number, any>>({});

  // declarations
  const [decls,      setDecls]      = useState<any[]>([]);
  const [declLoad,   setDeclLoad]   = useState(false);

  // ledger
  const [ledger,     setLedger]     = useState<any[]>([]);
  const [ledgerLoad, setLedgerLoad] = useState(false);

  // declaration confirm/reject
  const [confirmModal, setConfirmModal] = useState<any | null>(null);
  const [confirmedAmt, setConfirmedAmt] = useState("");
  const [rejectModal,  setRejectModal]  = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing,   setProcessing]   = useState(false);

  // bootstrap
  useEffect(() => {
    getProfitLoss().then(r => setProfit(r.data.data)).catch(() => {}).finally(() => setLoading(false));
    Promise.all([api.get("/api/v1/academic/sessions"), api.get("/api/v1/academic/terms")])
      .then(([s, t]) => { setSessions(s.data.data || []); setTerms(t.data.data || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "declarations") {
      setDeclLoad(true);
      api.get("/api/v1/finance/payment-declarations?limit=200")
        .then(r => setDecls(r.data.data || []))
        .catch(() => {})
        .finally(() => setDeclLoad(false));
    }
    if (tab === "ledger") {
      setLedgerLoad(true);
      api.get("/api/v1/finance/ledger?limit=200")
        .then(r => setLedger(r.data.data || []))
        .catch(() => {})
        .finally(() => setLedgerLoad(false));
    }
  }, [tab]);

  const loadDebtors = async () => {
    if (!sessionId || !termId) { return; }
    setDebtLoading(true);
    try {
      const [invR, studR] = await Promise.all([
        api.get(`/api/v1/finance/invoices/debtors?session_id=${sessionId}&term_id=${termId}`),
        api.get("/api/v1/students?limit=500&status=ACTIVE"),
      ]);
      setDebtors(invR.data.data || []);
      const map: Record<number, any> = {};
      for (const s of (studR.data.data || [])) map[s.id] = s;
      setStudents(map);
    } catch {}
    setDebtLoading(false);
  };

  const confirmDecl = async () => {
    if (!confirmedAmt || Number(confirmedAmt) <= 0) { toast.error("Enter confirmed amount"); return; }
    setProcessing(true);
    try {
      await api.put(`/api/v1/finance/payment-declarations/${confirmModal.id}/confirm`, { confirmed_amount: Number(confirmedAmt) });
      toast.success("Payment confirmed — invoice updated");
      setConfirmModal(null);
      setDeclLoad(true);
      api.get("/api/v1/finance/payment-declarations?limit=200").then(r => setDecls(r.data.data || [])).finally(() => setDeclLoad(false));
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setProcessing(false);
  };

  const rejectDecl = async () => {
    setProcessing(true);
    try {
      await api.put(`/api/v1/finance/payment-declarations/${rejectModal.id}/reject`, { rejection_reason: rejectReason || null });
      toast.success("Declaration rejected");
      setRejectModal(null);
      setRejectReason("");
      setDeclLoad(true);
      api.get("/api/v1/finance/payment-declarations?limit=200").then(r => setDecls(r.data.data || [])).finally(() => setDeclLoad(false));
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setProcessing(false);
  };

  const isProfit = profit && profit.profit >= 0;

  const summaryCards = profit ? [
    { label: "Total Income",    value: fmt(profit.total_income),                         icon: <TrendingUp size={20} />,    color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    { label: "General Expenses",value: fmt(profit.total_expenses ?? 0),                  icon: <Receipt size={20} />,       color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    { label: "Salaries Paid",   value: fmt(profit.total_salaries ?? 0),                  icon: <Users size={20} />,         color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
    { label: "Total Outgoings", value: fmt(profit.total_outgoings ?? profit.total_expenses), icon: <DollarSign size={20} />, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { label: isProfit ? "Net Profit" : "Net Loss", value: fmt(Math.abs(profit.profit)),
      icon: isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
      color: isProfit ? "#10b981" : "#ef4444", bg: isProfit ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" },
    { label: "Profit Margin",   value: `${profit.profit_margin_percent}%`,               icon: <BarChart2 size={20} />,     color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  ] : [];

  const chartData = profit ? [
    { name: "Income",    amount: profit.total_income,    fill: "#22c55e" },
    { name: "Expenses",  amount: profit.total_expenses ?? 0, fill: "#ef4444" },
    { name: "Salaries",  amount: profit.total_salaries ?? 0, fill: "#6366f1" },
    { name: "Outgoings", amount: profit.total_outgoings ?? profit.total_expenses, fill: "#f59e0b" },
    { name: "Profit",    amount: Math.max(profit.profit, 0), fill: "#10b981" },
  ] : [];

  const pendingDecls = decls.filter(d => d.status === "PENDING").length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 7, fontWeight: 600, fontSize: "0.8rem",
    cursor: "pointer", border: "none", transition: "all 0.15s",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--btn-primary-text)" : "var(--text-secondary)",
  });

  return (
    <DashboardLayout>
      <div className="t-page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="t-page-title">Finance Overview</h1>
          <p className="t-page-subtitle">Income, expenses, debtors and payment tracking</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: "4px", background: "var(--accent-light)", borderRadius: 10, width: "fit-content", flexWrap: "wrap" }}>
        {([
          { id: "overview",      label: "Overview" },
          { id: "debtors",       label: "Fee Debtors" },
          { id: "declarations",  label: "Declarations" },
          { id: "ledger",        label: "Ledger" },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button key={id} style={tabStyle(tab === id)} onClick={() => setTab(id)}>
            {label}
            {id === "declarations" && pendingDecls > 0 && tab !== "declarations" && (
              <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: "0.62rem", fontWeight: 800 }}>
                {pendingDecls}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        loading ? (
          <div className="flex justify-center py-20"><div className="t-spinner" /></div>
        ) : (
          <>
            {profit && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12, marginBottom: 20 }}>
                {summaryCards.map(({ label, value, icon, color, bg }) => (
                  <div key={label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                      {icon}
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {profit && (
              <div className="t-card" style={{ marginBottom: 20 }}>
                <h2 className="font-semibold t-text-primary" style={{ marginBottom: 16, fontSize: "0.9375rem" }}>Financial Summary</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                    <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {profit && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="t-card">
                  <h3 className="font-semibold t-text-primary" style={{ marginBottom: 12, fontSize: "0.875rem" }}>Outgoings Breakdown</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "General Expenses", amount: profit.total_expenses ?? 0, color: "#ef4444" },
                      { label: "Salaries Paid",    amount: profit.total_salaries ?? 0, color: "#6366f1" },
                    ].map(({ label, amount, color }) => {
                      const total = (profit.total_outgoings ?? profit.total_expenses) || 1;
                      const pct   = Math.round((amount / total) * 100);
                      return (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</span>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{fmt(amount)}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "var(--accent-light)" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pct}%`, transition: "width 0.4s" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>Total Outgoings</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f59e0b" }}>{fmt(profit.total_outgoings ?? profit.total_expenses)}</span>
                    </div>
                  </div>
                </div>

                <div className="t-card">
                  <h3 className="font-semibold t-text-primary" style={{ marginBottom: 12, fontSize: "0.875rem" }}>Net Position</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Total Income",    value: fmt(profit.total_income), color: "#22c55e" },
                      { label: "Total Outgoings", value: `– ${fmt(profit.total_outgoings ?? profit.total_expenses)}`, color: "#ef4444" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{isProfit ? "Net Profit" : "Net Loss"}</span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: isProfit ? "#10b981" : "#ef4444" }}>
                        {isProfit ? "" : "– "}{fmt(Math.abs(profit.profit))}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, padding: "8px 12px", borderRadius: 8, background: isProfit ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", textAlign: "center" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: isProfit ? "#10b981" : "#ef4444" }}>
                        {profit.profit_margin_percent}% profit margin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* ── DEBTORS TAB ── */}
      {tab === "debtors" && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: 4 }}>Session</p>
              <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={selStyle}>
                <option value="">Select Session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: 4 }}>Term</p>
              <select value={termId} onChange={e => setTermId(e.target.value)} style={selStyle} disabled={!sessionId}>
                <option value="">Select Term</option>
                {terms.filter(t => !sessionId || t.session_id === Number(sessionId)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button
              onClick={loadDebtors} disabled={!sessionId || !termId || debtLoading}
              style={{ padding: "6px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", alignSelf: "flex-end" }}
            >
              {debtLoading ? "Loading…" : "Load Debtors"}
            </button>
          </div>

          {debtors.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
              {[
                { icon: <AlertTriangle size={18} />, label: "Owing Students", value: debtors.length, color: "#ef4444" },
                { icon: <DollarSign size={18} />,    label: "Total Outstanding", value: fmt(debtors.reduce((s, i) => s + Number(i.balance), 0)), color: "#f59e0b" },
                { icon: <Users size={18} />,         label: "Partial Payments", value: debtors.filter(i => i.status === "PARTIAL").length, color: "#6366f1" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
                  <div style={{ color, marginBottom: 5 }}>{icon}</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="t-card overflow-x-auto">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {debtLoading ? (
                  <tr><td colSpan={5}><div className="flex justify-center py-10"><div className="t-spinner" /></div></td></tr>
                ) : debtors.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="t-empty">
                      <AlertTriangle size={36} />
                      <p>{sessionId && termId ? "No debtors found — all students have paid!" : "Select a session and term, then click Load Debtors."}</p>
                    </div>
                  </td></tr>
                ) : debtors.map((inv: any) => {
                  const s = students[inv.student_id];
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {s ? `${s.first_name} ${s.last_name}` : `Student #${inv.student_id}`}
                        </div>
                        {s?.admission_number && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{s.admission_number}</div>
                        )}
                      </td>
                      <td className="t-text-primary">{fmt(Number(inv.total_fee))}</td>
                      <td style={{ color: "#10b981", fontWeight: 600 }}>{fmt(Number(inv.paid_amount))}</td>
                      <td style={{ color: "#ef4444", fontWeight: 700 }}>{fmt(Number(inv.balance))}</td>
                      <td>
                        <span className={inv.status === "PARTIAL" ? "badge-yellow" : "badge-red"}>{inv.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── DECLARATIONS TAB ── */}
      {tab === "declarations" && (
        <div className="t-card overflow-x-auto">
          <table className="t-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Declared By</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {declLoad ? (
                <tr><td colSpan={8}><div className="flex justify-center py-10"><div className="t-spinner" /></div></td></tr>
              ) : decls.length === 0 ? (
                <tr><td colSpan={8}><div className="t-empty"><Clock size={36} /><p>No declarations found</p></div></td></tr>
              ) : decls.map((d: any) => (
                <tr key={d.id}>
                  <td className="t-text-primary">#{d.invoice_id}</td>
                  <td className="t-text-secondary">User #{d.declared_by}</td>
                  <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fmt(d.declared_amount)}</td>
                  <td className="t-text-secondary">{d.payment_method.replace("_", " ")}</td>
                  <td className="font-mono text-xs t-text-secondary">{d.reference || "—"}</td>
                  <td className="t-text-secondary">{new Date(d.declared_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</td>
                  <td>
                    <span className={d.status === "CONFIRMED" ? "badge-green" : d.status === "REJECTED" ? "badge-red" : "badge-yellow"}>
                      {d.status}
                    </span>
                    {d.status === "CONFIRMED" && d.confirmed_amount && (
                      <div style={{ fontSize: "0.68rem", color: "#10b981", marginTop: 2 }}>✓ {fmt(d.confirmed_amount)}</div>
                    )}
                    {d.status === "REJECTED" && d.rejection_reason && (
                      <div style={{ fontSize: "0.68rem", color: "#ef4444", marginTop: 2 }}>{d.rejection_reason}</div>
                    )}
                  </td>
                  <td>
                    {d.status === "PENDING" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setConfirmModal(d); setConfirmedAmt(String(d.declared_amount)); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                        >
                          <CheckCircle size={12} /> Confirm
                        </button>
                        <button
                          onClick={() => { setRejectModal(d); setRejectReason(""); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LEDGER TAB ── */}
      {tab === "ledger" && (
        <>
          {!ledgerLoad && ledger.length > 0 && (() => {
            const income  = ledger.filter(e => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
            const expense = ledger.filter(e => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);
            const salary  = ledger.filter(e => e.type === "SALARY").reduce((s, e) => s + e.amount, 0);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
                {[
                  { label: "Total Income",  value: fmt(income),           color: "#10b981" },
                  { label: "Expenses",      value: fmt(expense),          color: "#ef4444" },
                  { label: "Salaries",      value: fmt(salary),           color: "#6366f1" },
                  { label: "Net",           value: fmt(income - expense - salary), color: income >= expense + salary ? "#10b981" : "#ef4444" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="t-card overflow-x-auto">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLoad ? (
                  <tr><td colSpan={6}><div className="flex justify-center py-10"><div className="t-spinner" /></div></td></tr>
                ) : ledger.length === 0 ? (
                  <tr><td colSpan={6}><div className="t-empty"><p>No ledger entries yet</p></div></td></tr>
                ) : ledger.map((e: any, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700,
                        background: e.type === "INCOME" ? "rgba(16,185,129,0.12)" : e.type === "SALARY" ? "rgba(99,102,241,0.12)" : "rgba(239,68,68,0.12)",
                        color: e.type === "INCOME" ? "#10b981" : e.type === "SALARY" ? "#6366f1" : "#ef4444",
                      }}>
                        {e.type}
                      </span>
                    </td>
                    <td className="t-text-primary" style={{ fontSize: "0.8125rem" }}>{e.label}</td>
                    <td style={{ fontWeight: 700, color: e.type === "INCOME" ? "#10b981" : "#ef4444" }}>
                      {e.type === "INCOME" ? "+" : "–"}{fmt(e.amount)}
                    </td>
                    <td className="t-text-secondary">{e.method}</td>
                    <td className="font-mono text-xs t-text-secondary">{e.ref}</td>
                    <td className="t-text-secondary">{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null); }}>
          <div className="modal-box-md" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Confirm Payment</h2>
              <button onClick={() => setConfirmModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Invoice #{confirmModal.invoice_id} — Parent declared {fmt(confirmModal.declared_amount)}
              {confirmModal.reference ? ` · Ref: ${confirmModal.reference}` : ""}
            </p>
            <div>
              <label className="t-label">Confirmed Amount (₦) *</label>
              <input className="t-input" type="number" min="0.01" value={confirmedAmt} onChange={e => setConfirmedAmt(e.target.value)} />
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 4 }}>Enter the exact amount you verified was received.</p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={confirmDecl} disabled={processing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: "#10b981", color: "#fff" }}>
                <CheckCircle size={14} /> {processing ? "Confirming..." : "Confirm & Record Payment"}
              </button>
              <button className="t-btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(null); }}>
          <div className="modal-box-md" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Reject Declaration</h2>
              <button onClick={() => setRejectModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Invoice #{rejectModal.invoice_id} — {fmt(rejectModal.declared_amount)} declared
            </p>
            <div>
              <label className="t-label">Reason for Rejection (optional)</label>
              <input className="t-input" placeholder="e.g. Payment not found in our records" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={rejectDecl} disabled={processing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: "#ef4444", color: "#fff" }}>
                <XCircle size={14} /> {processing ? "Rejecting..." : "Reject Declaration"}
              </button>
              <button className="t-btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const selStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem", minWidth: 150,
};
