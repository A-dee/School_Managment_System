"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { getInvoices } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SLICE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ invoices: 0, paid: 0, partial: 0, unpaid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices({ limit: 500 }).then(res => {
      const invs: any[] = res.data.data || [];
      setStats({
        invoices: res.data.pagination?.total || invs.length,
        paid:     invs.filter(i => i.status === "PAID").length,
        partial:  invs.filter(i => i.status === "PARTIAL").length,
        unpaid:   invs.filter(i => i.status === "UNPAID").length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pieData = [
    { name: "Paid",    value: stats.paid },
    { name: "Partial", value: stats.partial },
    { name: "Unpaid",  value: stats.unpaid },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">Finance Dashboard</h1>
        <p className="t-page-subtitle">Overview of all invoices and payment collections</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Invoices"   value={stats.invoices} icon="📄" color="blue" />
        <StatCard title="Fully Paid"       value={stats.paid}     icon="✅" color="green" />
        <StatCard title="Partial Payment"  value={stats.partial}  icon="⚠️" color="yellow" />
        <StatCard title="Unpaid"           value={stats.unpaid}   icon="❌" color="red" />
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
                { label: "Fully Paid",  value: stats.paid,    color: "#22c55e" },
                { label: "Partial",     value: stats.partial, color: "#f59e0b" },
                { label: "Unpaid",      value: stats.unpaid,  color: "#ef4444" },
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
