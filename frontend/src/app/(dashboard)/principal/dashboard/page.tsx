"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { getStudents, getStaff, getClasses, getProfitLoss } from "@/lib/api";
import api from "@/lib/api";
import { GraduationCap, Users, School, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#22c55e", "#ef4444", "#6366f1"];
const ATT_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

export default function PrincipalDashboard() {
  const [stats, setStats] = useState({ students: 0, staff: 0, classes: 0 });
  const [profit, setProfit] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStudents({ limit: 1 }),
      getStaff({ limit: 1 }),
      getClasses({ limit: 1 }),
      getProfitLoss(),
      api.get("/api/v1/attendance/summary").catch(() => ({ data: { data: null } })),
    ]).then(([studRes, staffRes, classRes, profitRes, attRes]) => {
      setStats({
        students: studRes.data.pagination?.total || 0,
        staff:    staffRes.data.pagination?.total || 0,
        classes:  classRes.data.pagination?.total || 0,
      });
      setProfit(profitRes.data.data);
      setAttendance(attRes.data.data);
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

      {/* Attendance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="t-card lg:col-span-1">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold t-text-primary">Attendance Overview</h2>
          </div>
          {attendance && attendance.total > 0 ? (
            <>
              <div style={{ position: "relative" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: attendance.present },
                        { name: "Absent",  value: attendance.absent },
                        { name: "Late",    value: attendance.late },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%"
                      outerRadius={72} innerRadius={46}
                      dataKey="value" paddingAngle={2}
                    >
                      {ATT_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: string) => [`${v} records`, name]}
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{attendance.attendance_rate}%</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 2 }}>Avg Attendance</div>
                </div>
              </div>
              <div className="space-y-2 mt-2">
                {[
                  { label: "Present", val: attendance.present, pct: attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0, color: "#22c55e" },
                  { label: "Absent",  val: attendance.absent,  pct: attendance.total > 0 ? Math.round((attendance.absent  / attendance.total) * 100) : 0, color: "#ef4444" },
                  { label: "Late",    val: attendance.late,    pct: attendance.total > 0 ? Math.round((attendance.late    / attendance.total) * 100) : 0, color: "#f59e0b" },
                ].map(({ label, val, pct, color }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                      <span className="t-text-secondary">{label}</span>
                    </div>
                    <span className="font-semibold t-text-primary">{val.toLocaleString()} <span style={{ color, fontSize: "0.75rem" }}>({pct}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="t-empty" style={{ padding: "24px 0" }}>
              <p style={{ fontSize: "0.85rem" }}>No attendance records yet.</p>
            </div>
          )}
        </div>

        <div className="t-card lg:col-span-2">
          <h2 className="font-semibold t-text-primary mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Students per Class", val: stats.classes > 0 ? Math.round(stats.students / stats.classes) : "—", sub: "avg class size" },
              { label: "Staff to Student Ratio", val: stats.staff > 0 ? `1:${Math.round(stats.students / stats.staff)}` : "—", sub: "staff vs students" },
              { label: "Total Records", val: attendance ? attendance.total.toLocaleString() : "—", sub: "attendance entries" },
              { label: "Attendance Rate", val: attendance ? `${attendance.attendance_rate}%` : "—", sub: "present rate" },
            ].map(({ label, val, sub }) => (
              <div key={label} style={{ padding: "16px", borderRadius: 10, background: "var(--accent-light)", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{val}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>{label}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
