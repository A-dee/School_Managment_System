"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getProfitLoss } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import api from "@/lib/api";

export default function ReportsPage() {
  const [profit, setProfit] = useState<any>(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [exportSession, setExportSession] = useState("");
  const [exportTerm, setExportTerm] = useState("");
  const [exportClass, setExportClass] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;
      const res = await getProfitLoss(params);
      setProfit(res.data.data);
    } catch {}
    setLoading(false);
  };

  const loadMonthly = async () => {
    const data = [];
    for (let m = 1; m <= 12; m++) {
      try {
        const res = await getProfitLoss({ month: m, year: Number(year) });
        data.push({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1], ...res.data.data });
      } catch { data.push({ month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1], total_income: 0, total_expenses: 0, profit: 0 }); }
    }
    setMonthlyData(data);
  };

  useEffect(() => { load(); loadMonthly(); }, []);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/academic/sessions"),
      api.get("/api/v1/classes/?limit=200"),
    ]).then(([sessionRes, classRes]) => {
      setSessions(sessionRes.data.data || []);
      setClasses(classRes.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setExportTerm("");
    if (!exportSession) {
      setTerms([]);
      return;
    }
    api.get(`/api/v1/academic/terms?session_id=${exportSession}`)
      .then(r => setTerms(r.data.data || []))
      .catch(() => setTerms([]));
  }, [exportSession]);

  const debtorsExportHref = exportSession && exportTerm
    ? `/api/v1/exports/debtors?session_id=${exportSession}&term_id=${exportTerm}&fmt=excel`
    : "";
  const resultsExportHref = exportSession && exportTerm && exportClass
    ? `/api/v1/exports/results?class_id=${exportClass}&session_id=${exportSession}&term_id=${exportTerm}&fmt=excel`
    : "";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Financial Reports</h1>
        <p className="text-sm t-text-secondary">Profit & Loss analysis</p>
      </div>

      <div className="t-card mb-5 flex gap-3 flex-wrap items-end">
        <div>
          <label className="t-label">Month</label>
          <select className="t-input w-36" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">All months</option>
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) =>
              <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="t-label">Year</label>
          <input className="t-input w-28" type="number" value={year} onChange={e => setYear(e.target.value)} />
        </div>
        <button className="t-btn-primary text-sm" onClick={load} disabled={loading}>Apply</button>
        <a href="/api/v1/exports/payments?fmt=excel" className="t-btn-secondary text-sm">Export Payments</a>
        <a href="/api/v1/exports/students?fmt=excel" className="t-btn-secondary text-sm">Export Students</a>
        <a href="/api/v1/exports/staff?fmt=excel" className="t-btn-secondary text-sm">Export Staff</a>
      </div>

      <div className="t-card mb-5 flex gap-3 flex-wrap items-end">
        <div>
          <label className="t-label">Export Session</label>
          <select className="t-input w-44" value={exportSession} onChange={e => setExportSession(e.target.value)}>
            <option value="">Select session</option>
            {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="t-label">Export Term</label>
          <select className="t-input w-44" value={exportTerm} onChange={e => setExportTerm(e.target.value)} disabled={!exportSession}>
            <option value="">Select term</option>
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="t-label">Results Class</label>
          <select className="t-input w-44" value={exportClass} onChange={e => setExportClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {debtorsExportHref ? (
          <a href={debtorsExportHref} className="t-btn-secondary text-sm">Export Debtors</a>
        ) : (
          <button className="t-btn-secondary text-sm" disabled>Export Debtors</button>
        )}
        {resultsExportHref ? (
          <a href={resultsExportHref} className="t-btn-secondary text-sm">Export Results</a>
        ) : (
          <button className="t-btn-secondary text-sm" disabled>Export Results</button>
        )}
      </div>

      {profit && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Income"   value={`₦${profit.total_income.toLocaleString()}`}   icon="💰" color="green" />
            <StatCard title="Total Expenses" value={`₦${profit.total_expenses.toLocaleString()}`} icon="💸" color="red" />
            <StatCard title="Net Profit"     value={`₦${profit.profit.toLocaleString()}`}          icon="📊" color={profit.profit >= 0 ? "blue" : "red"} />
            <StatCard title="Profit Margin"  value={`${profit.profit_margin_percent}%`}             icon="📈" color="purple" />
          </div>

          <div className="t-card mb-6">
            <h2 className="font-semibold t-text-primary mb-4">Monthly Trend ({year})</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  formatter={(v: any) => `₦${Number(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="total_income" stroke="#10b981" strokeWidth={2} dot={false} name="Income" />
                <Line type="monotone" dataKey="total_expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="var(--accent)" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
