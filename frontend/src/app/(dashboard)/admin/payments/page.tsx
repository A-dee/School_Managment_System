"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getPayments, recordPayment } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Clock, X } from "lucide-react";

const fmt = (n: number | string) =>
  `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function PaymentsPage() {
  const [tab, setTab] = useState<"payments" | "declarations">("payments");

  // ── Payments ──
  const [payments, setPayments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    invoice_id: "", amount_paid: "", payment_method: "cash",
    receipt_number: "", payment_date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  // ── Declarations ──
  const [decls,       setDecls]       = useState<any[]>([]);
  const [declLoading, setDeclLoading] = useState(true);
  const [declFilter,  setDeclFilter]  = useState("PENDING");
  const [confirmModal, setConfirmModal] = useState<any | null>(null);
  const [confirmedAmt, setConfirmedAmt] = useState("");
  const [rejectModal,  setRejectModal]  = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await getPayments();
      setPayments(res.data.data || []);
    } catch { toast.error("Failed to load payments"); }
    setLoading(false);
  };

  const loadDecls = async () => {
    setDeclLoading(true);
    try {
      const params = declFilter ? `?status=${declFilter}` : "";
      const r = await api.get(`/api/v1/finance/payment-declarations${params}`);
      setDecls(r.data.data || []);
    } catch { toast.error("Failed to load declarations"); }
    setDeclLoading(false);
  };

  useEffect(() => { loadPayments(); }, []);
  useEffect(() => { if (tab === "declarations") loadDecls(); }, [tab, declFilter]);

  const save = async () => {
    if (!form.invoice_id || !form.amount_paid || !form.receipt_number) {
      toast.error("Fill required fields"); return;
    }
    setSaving(true);
    try {
      await recordPayment({ ...form, invoice_id: Number(form.invoice_id), amount_paid: Number(form.amount_paid) });
      toast.success("Payment recorded");
      setShowForm(false);
      setForm({ invoice_id: "", amount_paid: "", payment_method: "cash", receipt_number: "", payment_date: new Date().toISOString().split("T")[0] });
      loadPayments();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const confirmDecl = async () => {
    if (!confirmedAmt || Number(confirmedAmt) <= 0) { toast.error("Enter confirmed amount"); return; }
    setProcessing(true);
    try {
      await api.put(`/api/v1/finance/payment-declarations/${confirmModal.id}/confirm`, {
        confirmed_amount: Number(confirmedAmt),
      });
      toast.success("Payment confirmed — invoice updated");
      setConfirmModal(null);
      loadDecls();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setProcessing(false);
  };

  const rejectDecl = async () => {
    setProcessing(true);
    try {
      await api.put(`/api/v1/finance/payment-declarations/${rejectModal.id}/reject`, {
        rejection_reason: rejectReason || null,
      });
      toast.success("Declaration rejected");
      setRejectModal(null);
      setRejectReason("");
      loadDecls();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setProcessing(false);
  };

  const pendingCount = decls.filter(d => d.status === "PENDING").length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem",
    cursor: "pointer", border: "none", transition: "all 0.15s",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--btn-primary-text)" : "var(--text-secondary)",
  });

  return (
    <DashboardLayout>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold t-text-primary">Payments</h1>
          <p className="text-sm t-text-secondary">Record payments and review parent declarations</p>
        </div>
        {tab === "payments" && (
          <button className="t-btn-primary text-sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? "Cancel" : "+ Record Payment"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, padding: "4px", background: "var(--accent-light)", borderRadius: 10, width: "fit-content" }}>
        <button style={tabStyle(tab === "payments")} onClick={() => setTab("payments")}>
          Payments
        </button>
        <button style={tabStyle(tab === "declarations")} onClick={() => setTab("declarations")}>
          Declarations
          {pendingCount > 0 && tab !== "declarations" && (
            <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: "0.65rem", fontWeight: 800 }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Payments Tab ── */}
      {tab === "payments" && (
        <>
          {showForm && (
            <div className="t-card mb-5">
              <h2 className="font-semibold t-text-primary mb-4">Record Payment</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="t-label">Invoice ID *</label><input className="t-input" type="number" value={form.invoice_id} onChange={e => setForm(p => ({ ...p, invoice_id: e.target.value }))} /></div>
                <div><label className="t-label">Amount Paid (₦) *</label><input className="t-input" type="number" value={form.amount_paid} onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))} /></div>
                <div><label className="t-label">Receipt No *</label><input className="t-input" value={form.receipt_number} onChange={e => setForm(p => ({ ...p, receipt_number: e.target.value }))} /></div>
                <div>
                  <label className="t-label">Payment Method</label>
                  <select className="t-input" value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="pos">POS</option>
                  </select>
                </div>
                <div><label className="t-label">Date</label><input className="t-input" type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
              </div>
              <button className="t-btn-primary mt-4 text-sm" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Record Payment"}
              </button>
            </div>
          )}

          <div className="t-card overflow-x-auto">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><div className="flex justify-center py-10"><div className="t-spinner" /></div></td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={6}><div className="t-empty"><p>No payments yet</p></div></td></tr>
                ) : payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs t-text-secondary">{p.receipt_number}</td>
                    <td className="t-text-primary">#{p.invoice_id}</td>
                    <td style={{ fontWeight: 700, color: "#10b981" }}>{fmt(Number(p.amount_paid))}</td>
                    <td className="t-text-secondary capitalize">{p.payment_method}</td>
                    <td className="t-text-secondary">{p.payment_date}</td>
                    <td>
                      <a href={`/api/v1/pdfs/receipt/${p.id}`} target="_blank" className="t-btn-secondary text-xs py-1 px-2">Receipt</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Declarations Tab ── */}
      {tab === "declarations" && (
        <>
          {/* Filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["PENDING", "CONFIRMED", "REJECTED", ""].map(s => (
              <button
                key={s}
                onClick={() => setDeclFilter(s)}
                style={{
                  padding: "5px 14px", borderRadius: 7, fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer", border: "1px solid var(--border)",
                  background: declFilter === s ? "var(--accent)" : "var(--card-bg)",
                  color: declFilter === s ? "var(--btn-primary-text)" : "var(--text-secondary)",
                }}
              >
                {s || "All"}
              </button>
            ))}
          </div>

          <div className="t-card overflow-x-auto">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Declared By</th>
                  <th>Declared Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {declLoading ? (
                  <tr><td colSpan={8}><div className="flex justify-center py-10"><div className="t-spinner" /></div></td></tr>
                ) : decls.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="t-empty">
                      <Clock size={36} />
                      <p>No {declFilter.toLowerCase() || ""} declarations found</p>
                    </div>
                  </td></tr>
                ) : decls.map((d: any) => (
                  <tr key={d.id}>
                    <td className="t-text-primary">#{d.invoice_id}</td>
                    <td className="t-text-secondary">User #{d.declared_by}</td>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fmt(d.declared_amount)}</td>
                    <td className="t-text-secondary">{d.payment_method.replace("_", " ")}</td>
                    <td className="t-text-secondary font-mono text-xs">{d.reference || "—"}</td>
                    <td className="t-text-secondary">
                      {new Date(d.declared_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <span className={
                        d.status === "CONFIRMED" ? "badge-green" :
                        d.status === "REJECTED"  ? "badge-red" : "badge-yellow"
                      }>
                        {d.status}
                      </span>
                      {d.status === "CONFIRMED" && d.confirmed_amount && (
                        <div style={{ fontSize: "0.68rem", color: "#10b981", marginTop: 2 }}>
                          Confirmed: {fmt(d.confirmed_amount)}
                        </div>
                      )}
                      {d.status === "REJECTED" && d.rejection_reason && (
                        <div style={{ fontSize: "0.68rem", color: "#ef4444", marginTop: 2 }}>
                          {d.rejection_reason}
                        </div>
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
        </>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null); }}
        >
          <div className="modal-box-md" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Confirm Payment</h2>
              <button onClick={() => setConfirmModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Invoice #{confirmModal.invoice_id} — Parent declared {fmt(confirmModal.declared_amount)}
              {confirmModal.reference ? ` · Ref: ${confirmModal.reference}` : ""}
              {confirmModal.note ? ` · "${confirmModal.note}"` : ""}
            </p>
            <div>
              <label className="t-label">Confirmed Amount (₦) *</label>
              <input
                className="t-input"
                type="number" min="0.01"
                value={confirmedAmt}
                onChange={e => setConfirmedAmt(e.target.value)}
              />
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 4 }}>
                Enter the exact amount you have verified was received.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={confirmDecl} disabled={processing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: "#10b981", color: "#fff" }}
              >
                <CheckCircle size={14} /> {processing ? "Confirming..." : "Confirm & Record Payment"}
              </button>
              <button className="t-btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div className="modal-box-md" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Reject Declaration</h2>
              <button onClick={() => setRejectModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Invoice #{rejectModal.invoice_id} — {fmt(rejectModal.declared_amount)} declared
            </p>
            <div>
              <label className="t-label">Reason for Rejection (optional)</label>
              <input
                className="t-input"
                placeholder="e.g. Payment not found in our records"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={rejectDecl} disabled={processing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: "#ef4444", color: "#fff" }}
              >
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
