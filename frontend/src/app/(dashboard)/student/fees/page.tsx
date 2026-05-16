"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { initializePaystackPayment, verifyPaystackPayment } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CreditCard } from "lucide-react";

const fmt = (n: number | string) =>
  `NGN ${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function StudentFeesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingRef, setVerifyingRef] = useState("");

  const loadInvoices = () =>
    api.get("/api/v1/finance/invoices/my").then((r) => {
      setInvoices(r.data.data || []);
    });

  useEffect(() => {
    loadInvoices().catch(() => {}).finally(() => setLoading(false));
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
        await loadInvoices();
      })
      .catch((e: any) => {
        toast.error(e?.response?.data?.detail || "Failed to verify Paystack payment");
      });
  }, [verifyingRef]);

  const total = invoices.reduce((s, i) => s + Number(i.total_fee || 0), 0);
  const paid = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const balance = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  const statusClass = (s: string) => s === "PAID" ? "badge-green" : s === "PARTIAL" ? "badge-yellow" : "badge-red";

  const payWithPaystack = async (invoiceId: number) => {
    try {
      const r = await initializePaystackPayment(invoiceId);
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
      <div className="mb-6"><h1 className="text-2xl font-bold t-text-primary">My Fees</h1></div>

      {loading ? (
        <div className="t-card text-center py-10 t-text-secondary">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Total Billed</p><p className="text-xl font-bold t-text-primary">{fmt(total)}</p></div>
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Total Paid</p><p className="text-xl font-bold" style={{ color: "#22c55e" }}>{fmt(paid)}</p></div>
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Balance</p><p className="text-xl font-bold" style={{ color: balance > 0 ? "#ef4444" : "#22c55e" }}>{fmt(balance)}</p></div>
          </div>

          {invoices.length === 0 ? (
            <div className="t-card text-center py-10 t-text-secondary">No invoices found.</div>
          ) : (
            <div className="t-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Term / Session</th>
                    <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Amount</th>
                    <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Paid</th>
                    <th className="pb-3 pr-3 t-text-secondary font-medium text-left">Balance</th>
                    <th className="pb-3 t-text-secondary font-medium text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }} className="last:border-0">
                      <td className="py-2 pr-3 t-text-primary">{inv.term_name || `Term #${inv.term_id}`}</td>
                      <td className="py-2 pr-3 t-text-secondary">{fmt(inv.total_fee || 0)}</td>
                      <td className="py-2 pr-3 t-text-secondary">{fmt(inv.amount_paid || 0)}</td>
                      <td className="py-2 pr-3 font-medium t-text-primary">{fmt(inv.balance || 0)}</td>
                      <td className="py-2">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span className={statusClass(inv.status)}>{inv.status}</span>
                          {Number(inv.balance || 0) > 0 && (
                            <button
                              onClick={() => payWithPaystack(inv.id)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)",
                                background: "var(--accent-light)", color: "var(--accent)", cursor: "pointer",
                                fontSize: "0.72rem", fontWeight: 600,
                              }}
                            >
                              <CreditCard size={12} /> Paystack
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
