"use client";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { getStudents, getStaff, getClasses, getProfitLoss, getPaystackTransactions } from "@/lib/api";
import api from "@/lib/api";
import Link from "next/link";
import { GraduationCap, Users, School, TrendingUp, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS     = ["#22c55e", "#ef4444", "#6366f1"];
const ATT_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

function SkeletonStatCard() {
  return (
    <div className="t-card" style={{ minHeight: 110 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="t-skeleton t-skeleton-text mb-3" style={{ width: "55%" }} />
          <div className="t-skeleton" style={{ height: 34, width: "70%", borderRadius: 6 }} />
          <div className="t-skeleton t-skeleton-text mt-2" style={{ width: "45%" }} />
        </div>
        <div className="t-skeleton t-skeleton-circle" style={{ width: 44, height: 44 }} />
      </div>
      <div className="t-skeleton" style={{ height: 3, borderRadius: 999, marginTop: 16 }} />
    </div>
  );
}

function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div className="t-card">
      <div className="t-skeleton t-skeleton-text mb-5" style={{ width: 140 }} />
      <div className="t-skeleton" style={{ height, borderRadius: 10 }} />
    </div>
  );
}

export default function PrincipalDashboard() {
  const [stats,      setStats]      = useState({ students: 0, staff: 0, classes: 0 });
  const [profit,     setProfit]     = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [onlinePayments, setOnlinePayments] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getStudents({ limit: 1 }),
      getStaff({ limit: 1 }),
      getClasses({ limit: 1 }),
      getProfitLoss(),
      getPaystackTransactions({ status: "SUCCESS", limit: 6 }).catch(() => ({ data: { data: [] } })),
      api.get("/api/v1/attendance/summary").catch(() => ({ data: { data: null } })),
    ]).then(([studRes, staffRes, classRes, profitRes, paystackRes, attRes]) => {
      if (!mounted) return;
      setStats({
        students: studRes.data.pagination?.total || 0,
        staff:    staffRes.data.pagination?.total || 0,
        classes:  classRes.data.pagination?.total || 0,
      });
      setProfit(profitRes.data.data);
      setOnlinePayments(paystackRes.data.data || []);
      setAttendance(attRes.data.data);
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const financeBar = useMemo(() => profit ? [
    { name: "Income",   value: profit.total_income,           fill: "#22c55e" },
    { name: "Expenses", value: profit.total_expenses ?? 0,    fill: "#ef4444" },
    { name: "Salaries", value: profit.total_salaries ?? 0,    fill: "#6366f1" },
    { name: "Net",      value: Math.max(profit.profit, 0),    fill: profit.profit >= 0 ? "#10b981" : "#f59e0b" },
  ] : [], [profit]);

  const pieSplit = useMemo(() => profit ? [
    { name: "Income",   value: profit.total_income || 0.001 },
    { name: "Expenses", value: profit.total_expenses ?? 0 },
    { name: "Salaries", value: profit.total_salaries ?? 0 },
  ].filter(d => d.value > 0) : [], [profit]);

  const attBreakdown = useMemo(() => attendance ? [
    { label: "Present", val: attendance.present, pct: attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0, color: "#22c55e" },
    { label: "Absent",  val: attendance.absent,  pct: attendance.total > 0 ? Math.round((attendance.absent  / attendance.total) * 100) : 0, color: "#ef4444" },
    { label: "Late",    val: attendance.late,    pct: attendance.total > 0 ? Math.round((attendance.late    / attendance.total) * 100) : 0, color: "#f59e0b" },
  ] : [], [attendance]);

  const quickStats = useMemo(() => [
    { label: "Students per Class",  val: stats.classes > 0 ? Math.round(stats.students / stats.classes) : "—", sub: "avg class size" },
    { label: "Staff–Student Ratio", val: stats.staff > 0 ? `1:${Math.round(stats.students / stats.staff)}` : "—", sub: "staff vs students" },
    { label: "Total Records",       val: attendance ? attendance.total.toLocaleString() : "—", sub: "attendance entries" },
    { label: "Attendance Rate",     val: attendance ? `${attendance.attendance_rate}%` : "—",  sub: "present rate" },
  ], [stats, attendance]);

  const onlineSummary = useMemo(() => ({
    count: onlinePayments.length,
    totalAmount: onlinePayments.reduce((sum, tx) => sum + Number(tx.amount_minor || 0), 0) / 100,
  }), [onlinePayments]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <div className="t-skeleton t-skeleton-title mb-2" style={{ width: 200 }} />
          <div className="t-skeleton t-skeleton-text" style={{ width: 280 }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <SkeletonChart height={220} />
          <SkeletonChart height={220} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonChart height={200} />
          <div className="t-card lg:col-span-2">
            <div className="t-skeleton t-skeleton-text mb-5" style={{ width: 110 }} />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="t-skeleton" style={{ height: 88, borderRadius: 10 }} />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 animate-fade-in">
        <h1 className="t-page-title">School Overview</h1>
        <p className="t-page-subtitle">School-wide overview and performance metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="animate-fade-in delay-1"><StatCard title="Total Students"  value={stats.students} icon={<GraduationCap size={20} />} color="blue" /></div>
        <div className="animate-fade-in delay-2"><StatCard title="Total Staff"     value={stats.staff}    icon={<Users size={20} />}         color="green" /></div>
        <div className="animate-fade-in delay-3"><StatCard title="Active Classes"  value={stats.classes}  icon={<School size={20} />}        color="yellow" /></div>
        <div className="animate-fade-in delay-4"><StatCard
          title="Profit Margin"
          value={profit ? `${profit.profit_margin_percent}%` : "—"}
          icon={<TrendingUp size={20} />}
          color={profit?.profit >= 0 ? "green" : "red"}
          subtitle={profit ? `₦${Number(profit.profit).toLocaleString()} net` : undefined}
        /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-slide-up delay-2">
        <div className="t-card">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold t-text-primary">Recent Online Fee Payments</h2>
              <p className="t-text-secondary text-sm">Confirmed Paystack collections from parents</p>
            </div>
            <Link href="/principal/finance" className="t-btn-secondary" style={{ fontSize: "0.78rem" }}>
              Open Finance
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--accent-light)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Recent Confirmations</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)" }}>{onlineSummary.count}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--accent-light)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Visible Amount</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981" }}>â‚¦{onlineSummary.totalAmount.toLocaleString()}</div>
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
                    <div style={{ fontWeight: 700, color: "#10b981", fontSize: "0.86rem" }}>â‚¦{(Number(tx.amount_minor || 0) / 100).toLocaleString()}</div>
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

        <div className="t-card">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold t-text-primary">School Fees Acknowledgment</h2>
              <p className="t-text-secondary text-sm">Track parent payments and follow-up actions</p>
            </div>
            <CreditCard size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Review Fee Schedules", href: "/admin/fees", desc: "Manage class fee structures and generate invoices" },
              { label: "Track Online Payments", href: "/principal/finance", desc: "Verify Paystack settlements and reconciliation" },
              { label: "Check Parent Declarations", href: "/admin/fees", desc: "Confirm manual payment declarations from parents" },
              { label: "View Notifications", href: "/notifications", desc: "See payment confirmations sent to management" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="t-card t-card-hover" style={{ textDecoration: "none", padding: "14px 16px", display: "block" }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem", marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", lineHeight: 1.45 }}>{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {profit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-slide-up delay-2">
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
                  {financeBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
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
                { label: "Total Income", val: profit.total_income,           color: "#22c55e" },
                { label: "Expenses",     val: profit.total_expenses ?? 0,    color: "#ef4444" },
                { label: "Salaries",     val: profit.total_salaries ?? 0,    color: "#6366f1" },
                { label: "Net Profit",   val: profit.profit,                 color: profit.profit >= 0 ? "#10b981" : "#ef4444" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up delay-3">
        <div className="t-card lg:col-span-1">
          <h2 className="font-semibold t-text-primary mb-3">Attendance Overview</h2>
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
                {attBreakdown.map(({ label, val, pct, color }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
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
            {quickStats.map(({ label, val, sub }, i) => (
              <div key={label} className={`animate-scale-in delay-${i + 1}`} style={{ padding: "16px", borderRadius: 10, background: "var(--accent-light)", textAlign: "center" }}>
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
