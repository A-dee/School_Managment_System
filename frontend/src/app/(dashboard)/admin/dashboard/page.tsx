"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AnnouncementPanel from "@/components/AnnouncementPanel";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { getAnnouncements, getInvoices, getPaystackTransactions } from "@/lib/api";
import { Announcement } from "@/lib/announcements";
import { BellRing, CreditCard, Receipt, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SLICE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ invoices: 0, paid: 0, partial: 0, unpaid: 0 });
  const [onlinePayments, setOnlinePayments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getInvoices({ limit: 500 }),
      getAnnouncements({ include_all: true }).catch(() => ({ data: { data: [] } })),
      getPaystackTransactions({ status: "SUCCESS", limit: 8 }).catch(() => ({ data: { data: [] } })),
    ]).then(([res, annRes, paystackRes]) => {
      const invs: any[] = res.data.data || [];
      setStats({
        invoices: res.data.pagination?.total || invs.length,
        paid: invs.filter((i) => i.status === "PAID").length,
        partial: invs.filter((i) => i.status === "PARTIAL").length,
        unpaid: invs.filter((i) => i.status === "UNPAID").length,
      });
      setAnnouncements((annRes.data.data || []).slice(0, 4));
      setOnlinePayments(paystackRes.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pieData = [
    { name: "Paid", value: stats.paid },
    { name: "Partial", value: stats.partial },
    { name: "Unpaid", value: stats.unpaid },
  ].filter((d) => d.value > 0);

  const onlineTotal = useMemo(
    () => onlinePayments.reduce((sum, tx) => sum + Number(tx.amount_minor || 0), 0) / 100,
    [onlinePayments]
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">Finance Dashboard</h1>
        <p className="t-page-subtitle">Overview of invoices, collections, and online fee confirmations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Invoices" value={stats.invoices} icon={<Receipt size={18} />} color="blue" />
        <StatCard title="Fully Paid" value={stats.paid} icon={<Wallet size={18} />} color="green" />
        <StatCard title="Partial Payment" value={stats.partial} icon={<CreditCard size={18} />} color="yellow" />
        <StatCard title="Unpaid" value={stats.unpaid} icon={<BellRing size={18} />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="t-card">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold t-text-primary">School Fees Section</h2>
              <p className="t-text-secondary text-sm">Direct access to class fees, invoices, payments, and reconciliations</p>
            </div>
            <CreditCard size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Open School Fees", href: "/admin/fees", desc: "Manage fee schedules, invoices, and direct collections", icon: Wallet },
              { label: "Invoices", href: "/admin/invoices", desc: "Review billed students and outstanding balances", icon: Receipt },
              { label: "Payments", href: "/admin/payments", desc: "See recorded payments and receipt history", icon: CreditCard },
              { label: "Notifications", href: "/notifications", desc: "Watch for online payment confirmations", icon: BellRing },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="t-card t-card-hover" style={{ textDecoration: "none", padding: "14px 16px", display: "block" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Icon size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem" }}>{item.label}</div>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", lineHeight: 1.45 }}>{item.desc}</div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="t-card">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold t-text-primary">Recent Online Fee Confirmations</h2>
              <p className="t-text-secondary text-sm">Acknowledgment feed for parent payments from Paystack</p>
            </div>
            <Link href="/admin/fees" className="t-btn-secondary" style={{ fontSize: "0.78rem" }}>
              Open Fees
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--accent-light)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Recent Confirmations</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)" }}>{onlinePayments.length}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--accent-light)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Visible Amount</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981" }}>NGN {onlineTotal.toLocaleString()}</div>
            </div>
          </div>
          {onlinePayments.length > 0 ? (
            <div className="space-y-3">
              {onlinePayments.map((tx) => (
                <div key={tx.reference} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.86rem" }}>{tx.student_name || "Student payment"}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>Ref: {tx.reference}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: "#10b981", fontSize: "0.86rem" }}>NGN {(Number(tx.amount_minor || 0) / 100).toLocaleString()}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      {tx.paid_at ? new Date(tx.paid_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Awaiting timestamp"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="t-empty"><p>No online fee confirmations yet.</p></div>
          )}
        </div>

        <AnnouncementPanel
          announcements={announcements}
          href="/principal/announcements"
          actionLabel="Manage"
        />
      </div>

      {!loading && pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="t-card">
            <h2 className="font-semibold t-text-primary mb-4">Payment Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: "var(--text-secondary)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="t-card">
            <h2 className="font-semibold t-text-primary mb-4">Collection Rate</h2>
            <div className="space-y-4">
              {[
                { label: "Fully Paid", value: stats.paid, color: "#22c55e" },
                { label: "Partial", value: stats.partial, color: "#f59e0b" },
                { label: "Unpaid", value: stats.unpaid, color: "#ef4444" },
              ].map(({ label, value, color }) => {
                const pct = stats.invoices > 0 ? Math.round((value / stats.invoices) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="t-text-secondary">{label}</span>
                      <span className="t-text-primary font-medium">{value} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--border)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
