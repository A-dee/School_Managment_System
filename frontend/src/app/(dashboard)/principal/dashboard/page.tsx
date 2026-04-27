"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { getStudents, getStaff, getClasses, getProfitLoss } from "@/lib/api";
import { GraduationCap, Users, School, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";

const COLORS = ["#22c55e", "#ef4444", "#6366f1"];

export default function PrincipalDashboard() {
  const [stats, setStats] = useState({ students: 0, staff: 0, classes: 0 });
  const [profit, setProfit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStudents({ limit: 1 }),
      getStaff({ limit: 1 }),
      getClasses({ limit: 1 }),
      getProfitLoss(),
    ]).then(([studRes, staffRes, classRes, profitRes]) => {
      setStats({
        students: studRes.data.pagination?.total || 0,
        staff:    staffRes.data.pagination?.total || 0,
        classes:  classRes.data.pagination?.total || 0,
      });
      setProfit(profitRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32"><div className="t-spinner" /></div>
      </DashboardLayout>
    );
  }

  const financeBar = profit ? [
    { name: "Income",    value: profit.total_income,    fill: "#22c55e" },
    { name: "Expenses",  value: profit.total_expenses ?? 0, fill: "#ef4444" },
    { name: "Salaries",  value: profit.total_salaries ?? 0, fill: "#6366f1" },
    { name: "Net",       value: Math.max(profit.profit, 0), fill: profit.profit >= 0 ? "#10b981" : "#f59e0b" },
  ] : [];

  const pieSplit = profit ? [
    { name: "Income",    value: profit.total_income || 0.001 },
    { name: "Expenses",  value: profit.total_expenses ?? 0 },
    { name: "Salaries",  value: profit.total_salaries ?? 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">School Overview</h1>
        <p className="t-page-subtitle">School-wide overview and performance metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students"  value={stats.students} icon={<GraduationCap size={20} />} color="blue" />
        <StatCard title="Total Staff"     value={stats.staff}    icon={<Users size={20} />}         color="green" />
        <StatCard title="Active Classes"  value={stats.classes}  icon={<School size={20} />}        color="yellow" />
        <StatCard
          title="Profit Margin"
          value={profit ? `${profit.profit_margin_percent}%` : "—"}
          icon={<TrendingUp size={20} />}
          color={profit?.profit >= 0 ? "green" : "red"}
          subtitle={profit ? `₦${Number(profit.profit).toLocaleString()} net` : undefined}
        />
      </div>

      {profit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="t-card lg:col-span-2">
            <h2 className="font-semibold t-text-primary mb-4">Financial Overview</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={financeBar} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: any) => `₦${Number(v).toLocaleString()}`}
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }}
                  cursor={{ fill: "var(--accent-light)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {financeBar.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="t-card">
            <h2 className="font-semibold t-text-primary mb-1">Income vs Expenses</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieSplit} cx="50%" cy="50%" outerRadius={65} innerRadius={35} dataKey="value" paddingAngle={3}>
                  {pieSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: any) => `₦${Number(v).toLocaleString()}`}
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {[
                { label: "Total Income",    val: profit.total_income,              color: "#22c55e" },
                { label: "Expenses",        val: profit.total_expenses ?? 0,       color: "#ef4444" },
                { label: "Salaries",        val: profit.total_salaries ?? 0,       color: "#6366f1" },
                { label: "Net Profit",      val: profit.profit,                    color: profit.profit >= 0 ? "#10b981" : "#ef4444" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="t-text-secondary">{label}</span>
                  <span className="font-semibold" style={{ color }}>
                    {val < 0 ? "-" : ""}₦{Math.abs(Number(val)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
