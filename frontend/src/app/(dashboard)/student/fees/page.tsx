"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";

export default function StudentFeesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/finance/invoices/my").then(r => {
      setInvoices(r.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const balance = total - paid;

  const statusClass = (s: string) => s === "PAID" ? "badge-green" : s === "PARTIAL" ? "badge-yellow" : "badge-red";

  return (
    <DashboardLayout>
      <div className="mb-6"><h1 className="text-2xl font-bold t-text-primary">My Fees</h1></div>

      {loading ? (
        <div className="t-card text-center py-10 t-text-secondary">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Total Billed</p><p className="text-xl font-bold t-text-primary">₦{total.toLocaleString()}</p></div>
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Total Paid</p><p className="text-xl font-bold" style={{ color: "#22c55e" }}>₦{paid.toLocaleString()}</p></div>
            <div className="t-card text-center"><p className="t-text-secondary text-sm">Balance</p><p className="text-xl font-bold" style={{ color: balance > 0 ? "#ef4444" : "#22c55e" }}>₦{balance.toLocaleString()}</p></div>
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
                      <td className="py-2 pr-3 t-text-secondary">₦{Number(inv.amount).toLocaleString()}</td>
                      <td className="py-2 pr-3 t-text-secondary">₦{Number(inv.amount_paid || 0).toLocaleString()}</td>
                      <td className="py-2 pr-3 font-medium t-text-primary">₦{(Number(inv.amount) - Number(inv.amount_paid || 0)).toLocaleString()}</td>
                      <td className="py-2"><span className={statusClass(inv.status)}>{inv.status}</span></td>
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
