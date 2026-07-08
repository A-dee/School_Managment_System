"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { getMyPaystackTransactions, initializePaystackPayment, verifyPaystackPayment, getInstallments } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Send, Clock, CheckCircle, XCircle, CreditCard } from "lucide-react";

const fmt = (n: number | string) =>
  `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const statusBadge: Record<string, string> = {
  PAID: "badge-green", PARTIAL: "badge-yellow", UNPAID: "badge-red",
};

const declBadge: Record<string, { cls: string; icon: any }> = {
  PENDING:   { cls: "badge-yellow", icon: Clock },
  CONFIRMED: { cls: "badge-green",  icon: CheckCircle },
  REJECTED:  { cls: "badge-red",    icon: XCircle },
};

const txBadge: Record<string, string> = {
  INITIALIZED: "badge-blue",
  PENDING: "badge-yellow",
  SUCCESS: "badge-green",
  FAILED: "badge-red",
};

const blankDecl = {
  declared_amount: "", payment_method: "BANK_TRANSFER", reference: "", note: "", payment_option: 50 as 50 | 100,
};

export default function StudentFeesPage() {
  const [invoices,  setInvoices]  = useState<any[]>([]);
  const [decls,     setDecls]     = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<Record<number, any>>({});
  const [loading,   setLoading]   = useState(true);

  // Declaration modal
  const [declInvoice, setDeclInvoice] = useState<any | null>(null);
  const [declForm,    setDeclForm]    = useState(blankDecl);
  const [declaring,   setDeclaring]   = useState(false);
  const [verifyingRef, setVerifyingRef] = useState("");

  const loadData = () =>
    Promise.all([
      api.get("/api/v1/finance/invoices/my"),
      api.get("/api/v1/finance/payment-declarations/my"),
      getMyPaystackTransactions({ limit: 100 }),
    ]).then(async ([invR, declR, txR]) => {
      const invs = invR.data.data || [];
      setInvoices(invs);
      setDecls(declR.data.data || []);
      setTransactions(txR.data.data || []);

      // Load installment plans for each invoice
      const plansMap: Record<number, any> = {};
      await Promise.all(
        invs.map(async (inv: any) => {
          try {
            const res = await getInstallments(inv.id);
            if (res.data.data) {
              plansMap[inv.id] = res.data.data;
            }
          } catch {
            // ignore if no plan
          }
        })
      );
      setInstallmentPlans(plansMap);
    });

  useEffect(() => {
    loadData()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const reference = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("reference")
      : null;
    if (!reference || verifyingRef === reference) return;
    setVerifyingRef(reference);
    verifyPaystackPayment(reference)
      .then(async () => {
        toast.success("Paystack payment verified");
        await loadData();
      })
      .catch((e: any) => {
        toast.error(e?.response?.data?.detail || "Failed to verify Paystack payment");
      });
  }, [verifyingRef]);

  const totalOwed = invoices.reduce((s, i) => s + Number(i.balance), 0);

  const openDeclare = (inv: any) => {
    setDeclInvoice(inv);
    const defaultOption = Number(inv.paid_amount || 0) > 0 ? 100 : 50;
    const scheduleAmount = defaultOption === 50 ? Number(inv.total_fee) * 0.5 : Number(inv.balance);
    setDeclForm({ ...blankDecl, payment_option: defaultOption as 50 | 100, declared_amount: String(scheduleAmount) });
  };

  const submitDecl = async () => {
    if (!declForm.declared_amount || Number(declForm.declared_amount) <= 0) {
      toast.error("Enter a valid amount"); return;
    }
    setDeclaring(true);
    try {
      await api.post("/api/v1/finance/payment-declarations", {
        invoice_id:      declInvoice.id,
        declared_amount: Number(declForm.declared_amount),
        payment_method:  declForm.payment_method,
        reference:       declForm.reference || null,
        note:            declForm.note || null,
        payment_option:  declForm.payment_option,
      });
      toast.success("Payment declared — awaiting accountant confirmation");
      setDeclInvoice(null);
      // Refresh declarations
      const r = await api.get("/api/v1/finance/payment-declarations/my");
      setDecls(r.data.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to submit declaration");
    }
    setDeclaring(false);
  };

  const invoiceDecls = (invId: number) =>
    decls.filter(d => d.invoice_id === invId);

  const invoiceTransactions = (invId: number) =>
    transactions.filter(t => t.invoice_id === invId);

  const payWithPaystack = async (inv: any, paymentOption: 50 | 100) => {
    try {
      const r = await initializePaystackPayment(inv.id, paymentOption);
      const url = r.data.data?.authorization_url;
      if (!url) {
        toast.error("Paystack checkout URL is missing");
        return;
      }
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to start Paystack checkout");
    }
  };

  const payMilestone = async (inv: any, milestone: any) => {
    try {
      const r = await initializePaystackPayment(inv.id, 100, milestone.id);
      const url = r.data.data?.authorization_url;
      if (!url) {
        toast.error("Paystack checkout URL is missing");
        return;
      }
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to start Paystack checkout");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">My Fees</h1>
        <p className="t-text-secondary text-sm mt-1">View invoices and manage payments</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="t-spinner" /></div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
            <div className="t-card">
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Outstanding Balance
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: totalOwed > 0 ? "#ef4444" : "#10b981" }}>
                {fmt(totalOwed)}
              </p>
            </div>
            <div className="t-card">
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Total Invoices
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>{invoices.length}</p>
            </div>
            <div className="t-card">
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Pending Declarations
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b" }}>
                {decls.filter(d => d.status === "PENDING").length}
              </p>
            </div>
          </div>

          {/* Invoices */}
          {invoices.length === 0 ? (
            <div className="t-card">
              <div className="t-empty"><p>No invoices found.</p></div>
            </div>
          ) : invoices.map((inv: any) => {
            const myDecls = invoiceDecls(inv.id);
            const hasPending = myDecls.some(d => d.status === "PENDING");
            const plan = installmentPlans[inv.id];
            const hasPlan = plan && plan.milestones && plan.milestones.length > 0;
            return (
              <div key={inv.id} className="t-card animate-fade-in" style={{ marginBottom: 14 }}>
                {/* Invoice header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      Invoice #{inv.id} ({inv.term_name || `Term #${inv.term_id}`})
                    </p>
                    {inv.due_date && (
                      <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        Due: {new Date(inv.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={statusBadge[inv.status] || "badge-red"}>{inv.status}</span>
                    {Number(inv.balance) > 0 && !hasPending && (
                      <>
                        {!hasPlan && (
                          Number(inv.paid_amount || 0) <= 0 ? (
                            <>
                              <button
                                onClick={() => payWithPaystack(inv, 50)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                                  background: "var(--accent-light)", color: "var(--accent)",
                                  fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                                }}
                              >
                                <CreditCard size={13} /> Pay 50%
                              </button>
                              <button
                                onClick={() => payWithPaystack(inv, 100)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                                  background: "var(--accent-light)", color: "var(--accent)",
                                  fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                                }}
                              >
                                <CreditCard size={13} /> Pay 100%
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => payWithPaystack(inv, 100)}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                                background: "var(--accent-light)", color: "var(--accent)",
                                fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                              }}
                            >
                              <CreditCard size={13} /> Pay Balance
                            </button>
                          )
                        )}
                        <button
                          onClick={() => openDeclare(inv)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 8, border: "none",
                            background: "var(--accent)", color: "var(--btn-primary-text)",
                            fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                          }}
                        >
                          <Send size={13} /> Declare Payment
                        </button>
                      </>
                    )}
                    {hasPending && (
                      <span style={{ fontSize: "0.75rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} /> Declaration pending review
                      </span>
                    )}
                  </div>
                </div>

                {/* Fee breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Total Fee",   value: fmt(inv.total_fee),   color: "var(--text-primary)" },
                    { label: "Paid",        value: fmt(inv.paid_amount), color: "#10b981" },
                    { label: "Balance",     value: fmt(inv.balance),     color: Number(inv.balance) > 0 ? "#ef4444" : "#10b981" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center", padding: "10px 8px", background: "var(--accent-light)", borderRadius: 8 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Stepper progress if installment plan exists */}
                {hasPlan && (
                  <div style={{ marginTop: 6, marginBottom: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                      Tuition Installments Progress
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", paddingLeft: 10 }}>
                      {[...plan.milestones]
                        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .map((m: any, index: number, arr: any[]) => {
                          const isPaid = m.status === "PAID";
                          const isOverdue = m.status === "OVERDUE";
                          const isActive = !isPaid && arr.findIndex((x: any) => x.status !== "PAID") === index;
                          
                          return (
                            <div key={m.id} style={{ display: "flex", gap: 14, position: "relative" }}>
                              {index < arr.length - 1 && (
                                <div style={{
                                  position: "absolute",
                                  left: 9,
                                  top: 24,
                                  bottom: -16,
                                  width: 2,
                                  background: isPaid ? "#10b981" : "var(--border)",
                                  zIndex: 0,
                                }} />
                              )}
                              
                              <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: isPaid ? "#10b981" : (isOverdue ? "#ef4444" : "var(--bg-page)"),
                                border: `2px solid ${isPaid ? "#10b981" : (isOverdue ? "#ef4444" : (isActive ? "var(--accent)" : "var(--border)"))}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 1,
                                flexShrink: 0,
                                color: isPaid || isOverdue ? "#fff" : "transparent",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                              }}>
                                {isPaid ? "✓" : (isOverdue ? "!" : "")}
                              </div>
                              
                              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: "0.85rem", fontWeight: isActive ? 700 : 600, color: isActive ? "var(--accent)" : "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.name}
                                  </p>
                                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2, margin: 0 }}>
                                    Due: {new Date(m.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} &middot; {fmt(m.amount)}
                                  </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                  {isPaid ? (
                                    <span className="badge-green">Paid</span>
                                  ) : isOverdue ? (
                                    <>
                                      <span className="badge-red">Overdue</span>
                                      {isActive && (
                                        <button
                                          onClick={() => payMilestone(inv, m)}
                                          className="t-btn-primary"
                                          style={{ padding: "6px 12px", fontSize: "0.72rem", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}
                                        >
                                          <CreditCard size={12} /> Pay Milestone
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span className="badge-gray" style={{ background: "var(--border)", color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 12, fontSize: "0.68rem", fontWeight: 600 }}>Pending</span>
                                      {isActive && (
                                        <button
                                          onClick={() => payMilestone(inv, m)}
                                          className="t-btn-primary"
                                          style={{ padding: "6px 12px", fontSize: "0.72rem", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}
                                        >
                                          <CreditCard size={12} /> Pay Milestone
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Declaration history for this invoice */}
                {myDecls.length > 0 && (
                  <div>
                    <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Your Declarations
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {myDecls.map((d: any) => {
                        const { cls, icon: Icon } = declBadge[d.status] || declBadge.PENDING;
                        return (
                          <div key={d.id} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "8px 12px", borderRadius: 8, background: "var(--accent-light)",
                            border: "1px solid var(--border)", flexWrap: "wrap", gap: 8,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                               <Icon size={14} />
                               <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                 {fmt(d.declared_amount)}
                               </span>
                               <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                                 via {d.payment_method.replace("_", " ")}
                                 {d.reference ? ` · Ref: ${d.reference}` : ""}
                               </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className={cls}>{d.status}</span>
                              {d.status === "CONFIRMED" && d.confirmed_amount && (
                                <span style={{ fontSize: "0.72rem", color: "#10b981" }}>
                                  Confirmed: {fmt(d.confirmed_amount)}
                                </span>
                              )}
                              {d.status === "REJECTED" && d.rejection_reason && (
                                <span style={{ fontSize: "0.72rem", color: "#ef4444" }}>
                                  {d.rejection_reason}
                                </span>
                              )}
                              <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                                {new Date(d.declared_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {invoiceTransactions(inv.id).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Online Payment Attempts
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {invoiceTransactions(inv.id).slice(0, 3).map((tx: any) => (
                        <div key={tx.reference} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span className={txBadge[tx.status] || "badge-blue"}>{tx.status}</span>
                              <span style={{ fontSize: "0.76rem", color: "var(--text-primary)", fontWeight: 600 }}>Ref: {tx.reference}</span>
                            </div>
                            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 3 }}>
                              {new Date(tx.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          {(tx.status === "INITIALIZED" || tx.status === "PENDING") && (
                            <button
                              onClick={() => verifyPaystackPayment(tx.reference).then(() => loadData())}
                              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--accent-light)", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Declaration modal */}
      {declInvoice && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setDeclInvoice(null); }}
        >
          <div className="modal-box-md" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Declare Payment</h2>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  Invoice #{declInvoice.id} · Balance: {fmt(declInvoice.balance)}
                </p>
              </div>
              <button onClick={() => setDeclInvoice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="t-label">Payment Schedule *</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Number(declInvoice.paid_amount || 0) <= 0 && (
                    <button
                      type="button"
                      onClick={() => setDeclForm(p => ({ ...p, payment_option: 50, declared_amount: String(Number(declInvoice.total_fee) * 0.5) }))}
                      className={declForm.payment_option === 50 ? "t-btn-primary" : "t-btn-secondary"}
                      style={{ fontSize: "0.78rem" }}
                    >
                      50% - {fmt(Number(declInvoice.total_fee) * 0.5)}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeclForm(p => ({ ...p, payment_option: 100, declared_amount: String(Number(declInvoice.balance)) }))}
                    className={declForm.payment_option === 100 ? "t-btn-primary" : "t-btn-secondary"}
                    style={{ fontSize: "0.78rem" }}
                  >
                    100% - {fmt(declInvoice.balance)}
                  </button>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 8 }}>
                  Students can only choose 50% first or clear the full balance.
                </p>
              </div>
              <div>
                <label className="t-label">Payment Method</label>
                <select className="t-input" value={declForm.payment_method} onChange={e => setDeclForm(p => ({ ...p, payment_method: e.target.value }))}>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="POS">POS</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="t-label">Bank Reference / Transaction ID</label>
                <input
                  className="t-input"
                  placeholder="e.g. TXN-123456789"
                  value={declForm.reference}
                  onChange={e => setDeclForm(p => ({ ...p, reference: e.target.value }))}
                />
              </div>
              <div>
                <label className="t-label">Note (optional)</label>
                <input
                  className="t-input"
                  placeholder="Any additional information"
                  value={declForm.note}
                  onChange={e => setDeclForm(p => ({ ...p, note: e.target.value }))}
                />
              </div>
            </div>

            <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 14, lineHeight: 1.5 }}>
              Your declaration will be reviewed by the school accountant. The payment will only be confirmed after their verification.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                className="t-btn-primary"
                onClick={submitDecl} disabled={declaring}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Send size={14} /> {declaring ? "Submitting..." : "Submit Declaration"}
              </button>
              <button className="t-btn-secondary" onClick={() => setDeclInvoice(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
