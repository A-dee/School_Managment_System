"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { X, Send, Clock, CheckCircle, XCircle } from "lucide-react";

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

const blankDecl = {
  declared_amount: "", payment_method: "BANK_TRANSFER", reference: "", note: "",
};

export default function ParentFeesPage() {
  const [children,  setChildren]  = useState<any[]>([]);
  const [selected,  setSelected]  = useState<any>(null);
  const [invoices,  setInvoices]  = useState<any[]>([]);
  const [decls,     setDecls]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);

  // Declaration modal
  const [declInvoice, setDeclInvoice] = useState<any | null>(null);
  const [declForm,    setDeclForm]    = useState(blankDecl);
  const [declaring,   setDeclaring]   = useState(false);

  useEffect(() => {
    api.get("/api/v1/parents/me/children")
      .then(r => { const c = r.data.data || []; setChildren(c); if (c.length > 0) setSelected(c[0]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/v1/finance/invoices/student/${selected.id}`),
      api.get("/api/v1/finance/payment-declarations/my"),
    ])
      .then(([invR, declR]) => {
        setInvoices(invR.data.data || []);
        setDecls(declR.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  const totalOwed = invoices.reduce((s, i) => s + Number(i.balance), 0);

  const openDeclare = (inv: any) => {
    setDeclInvoice(inv);
    setDeclForm({ ...blankDecl, declared_amount: String(Number(inv.balance)) });
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

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">School Fees</h1>
          <p className="t-page-subtitle">View invoices and declare your payments</p>
        </div>
      </div>

      {/* Child tabs */}
      {children.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {children.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={selected?.id === c.id ? "t-btn-primary" : "t-btn-secondary"}
              style={{ fontSize: "0.8125rem" }}
            >
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}

      {selected && (
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
          {loading ? (
            <div className="flex justify-center py-12"><div className="t-spinner" /></div>
          ) : invoices.length === 0 ? (
            <div className="t-card">
              <div className="t-empty"><p>No invoices found for {selected.first_name}.</p></div>
            </div>
          ) : invoices.map((inv: any) => {
            const myDecls = invoiceDecls(inv.id);
            const hasPending = myDecls.some(d => d.status === "PENDING");
            return (
              <div key={inv.id} className="t-card animate-fade-in" style={{ marginBottom: 14 }}>
                {/* Invoice header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      Invoice #{inv.id}
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
              </div>
            );
          })}
        </>
      )}

      {/* Declaration modal */}
      {declInvoice && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeclInvoice(null); }}
        >
          <div className="t-card animate-fade-in" style={{ width: "100%", maxWidth: 480, margin: 16 }}>
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
                <label className="t-label">Amount You Have Paid (₦) *</label>
                <input
                  className="t-input" type="number" min="1"
                  placeholder={`Max: ${Number(declInvoice.balance)}`}
                  value={declForm.declared_amount}
                  onChange={e => setDeclForm(p => ({ ...p, declared_amount: e.target.value }))}
                />
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
