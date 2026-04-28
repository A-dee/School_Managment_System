"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getRole } from "@/lib/auth";
import { CheckCircle, XCircle, X, ChevronLeft, ChevronRight, DollarSign, Receipt, Users } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const statusBadge = (s: string) =>
  s === "APPROVED" ? "badge-green" : s === "REJECTED" ? "badge-red" : "badge-yellow";

const blankForm = {
  title: "", description: "", amount: "", category: "",
  date: new Date().toISOString().split("T")[0],
};

type Tab = "expenses" | "salaries";

export default function ExpensesPage() {
  const now = new Date();
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year,  setYear]        = useState(now.getFullYear());
  const [tab,   setTab]         = useState<Tab>("expenses");

  /* -- expenses -- */
  const [expenses,   setExpenses]   = useState<any[]>([]);
  const [expLoading, setExpLoading] = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(blankForm);
  const [saving,     setSaving]     = useState(false);
  const [acting,     setActing]     = useState<number | null>(null);
  const [approver,   setApprover]   = useState(false);

  /* -- salaries -- */
  const [payrolls,   setPayrolls]   = useState<any[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [staffMap,   setStaffMap]   = useState<Record<number, string>>({});

  const role = getRole() || "";
  const isAdmin = role === "ADMIN";

  useEffect(() => {
    setApprover(["PRINCIPAL", "SUPER_ADMIN"].includes(role));
  }, []);

  const loadExpenses = async () => {
    setExpLoading(true);
    try {
      const res = await api.get("/api/v1/finance/expenditures");
      setExpenses(res.data.data || []);
    } catch { toast.error("Failed to load expenses"); }
    setExpLoading(false);
  };

  const loadPayrolls = async () => {
    setPayLoading(true);
    try {
      const res = await api.get(`/api/v1/finance/payroll?month=${month}&year=${year}`);
      setPayrolls(res.data.data || []);
    } catch { toast.error("Failed to load salary payments"); }
    setPayLoading(false);
  };

  /* load staff names once for lookup */
  useEffect(() => {
    api.get("/api/v1/staff?limit=500").then(r => {
      const map: Record<number, string> = {};
      (r.data.data || []).forEach((s: any) => { map[s.id] = s.full_name; });
      setStaffMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadExpenses(); }, []);
  useEffect(() => { loadPayrolls(); }, [month, year]);

  /* filter expenses by month/year */
  const monthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  /* paid salaries for the selected month */
  const paidSalaries = payrolls.filter(p => p.payment_status === "PAID");

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title || !form.amount || !form.category) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await api.post("/api/v1/finance/expenditures", { ...form, amount: Number(form.amount) });
      toast.success("Expense recorded — pending approval");
      setShowForm(false);
      setForm(blankForm);
      loadExpenses();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const approve = async (id: number) => {
    setActing(id);
    try {
      await api.post(`/api/v1/finance/expenditures/${id}/approve`);
      toast.success("Expense approved");
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, approval_status: "APPROVED" } : e));
    } catch { toast.error("Failed"); }
    setActing(null);
  };

  const reject = async (id: number) => {
    setActing(id);
    try {
      await api.post(`/api/v1/finance/expenditures/${id}/reject`);
      toast.success("Expense rejected");
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, approval_status: "REJECTED" } : e));
    } catch { toast.error("Failed"); }
    setActing(null);
  };

  /* summary stats */
  const approvedExpenses = monthExpenses.filter(e => e.approval_status === "APPROVED");
  const pendingCount     = monthExpenses.filter(e => e.approval_status === "PENDING").length;
  const totalExpenses    = approvedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalSalaries    = paidSalaries.reduce((s, p) => s + Number(p.net_salary), 0);
  const totalOutgoings   = totalExpenses + totalSalaries;

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="t-text-primary" style={{ fontSize: "1.25rem", fontWeight: 700 }}>Finance — Expenses</h1>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 2 }}>
            Track all school expenditure and salary payments
          </p>
        </div>

        {/* Month navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={navBtn}><ChevronLeft size={16} /></button>
          <div style={{
            padding: "6px 18px", borderRadius: 8, background: "var(--card-bg)",
            border: "1px solid var(--border)", fontWeight: 600, fontSize: "0.875rem",
            color: "var(--text-primary)", minWidth: 156, textAlign: "center",
          }}>
            {MONTHS[month - 1]} {year}
          </div>
          <button onClick={nextMonth} style={navBtn}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Summary cards — hidden for ADMIN (Principal) */}
      {!isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { icon: <Receipt size={18} />,    label: "Expenses This Month", value: fmt(totalExpenses),  color: "#ef4444" },
            { icon: <Users size={18} />,      label: "Salaries Paid",       value: fmt(totalSalaries),  color: "#6366f1" },
            { icon: <DollarSign size={18} />, label: "Total Outgoings",     value: fmt(totalOutgoings), color: "#f59e0b" },
            { icon: <XCircle size={18} />,    label: "Pending Approval",    value: pendingCount,        color: "#94a3b8" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ color, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs — ADMIN only sees the expenses tab + record button */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {!isAdmin && ([["expenses", "General Expenses"], ["salaries", "Salary Payments"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key} onClick={() => setTab(key)}
            style={{
              padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: "0.8125rem", fontWeight: 600,
              background: tab === key ? "var(--accent)" : "var(--accent-light)",
              color:      tab === key ? "var(--btn-primary-text)" : "var(--accent)",
              transition: "all 0.12s",
            }}
          >
            {label}
          </button>
        ))}
        {(tab === "expenses" || isAdmin) && (
          <button
            className="t-btn-primary"
            style={{ marginLeft: isAdmin ? 0 : "auto", fontSize: "0.8125rem" }}
            onClick={() => setShowForm(v => !v)}
          >
            {showForm ? <><X size={14} style={{ display: "inline", marginRight: 4 }} />Cancel</> : "+ Record Expense"}
          </button>
        )}
      </div>

      {/* ======== GENERAL EXPENSES TAB ======== */}
      {(tab === "expenses" || isAdmin) && (
        <>
          {showForm && (
            <div className="t-card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontWeight: 600, marginBottom: 14, fontSize: "0.9rem" }} className="t-text-primary">
                Record New Expense
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="t-label">Title *</label>
                  <input className="t-input" placeholder="e.g. Generator fuel" value={form.title} onChange={e => setF("title", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Category *</label>
                  <input className="t-input" placeholder="e.g. Utilities, Supplies" value={form.category} onChange={e => setF("category", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Amount (₦) *</label>
                  <input className="t-input" type="number" placeholder="0.00" value={form.amount} onChange={e => setF("amount", e.target.value)} />
                </div>
                <div>
                  <label className="t-label">Date</label>
                  <input className="t-input" type="date" value={form.date} onChange={e => setF("date", e.target.value)} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label className="t-label">Description</label>
                  <textarea className="t-input" rows={2} style={{ resize: "none" }} placeholder="Additional details..." value={form.description} onChange={e => setF("description", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="t-btn-primary" onClick={save} disabled={saving}>{saving ? "Recording…" : "Record Expense"}</button>
                <button className="t-btn-secondary" onClick={() => { setShowForm(false); setForm(blankForm); }}>Cancel</button>
              </div>
            </div>
          )}

          {!isAdmin && <div className="t-card" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    {approver && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {expLoading || payLoading ? (
                    <tr><td colSpan={approver ? 6 : 5} style={{ textAlign: "center", padding: "40px 0" }}>Loading…</td></tr>
                  ) : (monthExpenses.length === 0 && paidSalaries.length === 0) ? (
                    <tr><td colSpan={approver ? 6 : 5}>
                      <div className="t-empty"><p>No expenses recorded for {MONTHS[month - 1]} {year}.</p></div>
                    </td></tr>
                  ) : (
                    <>
                      {/* Regular expense rows */}
                      {monthExpenses.map((e: any) => (
                        <tr key={`exp-${e.id}`}>
                          <td>
                            <p className="t-text-primary font-medium">{e.title}</p>
                            {e.description && <p className="t-text-secondary" style={{ fontSize: "0.72rem" }}>{e.description}</p>}
                          </td>
                          <td className="t-text-secondary">{e.category}</td>
                          <td style={{ color: "#ef4444", fontWeight: 600 }}>{fmt(Number(e.amount))}</td>
                          <td className="t-text-secondary">{e.date}</td>
                          <td><span className={statusBadge(e.approval_status)}>{e.approval_status}</span></td>
                          {approver && (
                            <td>
                              {e.approval_status === "PENDING" ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    onClick={() => approve(e.id)} disabled={acting === e.id}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-success-bg)", color: "var(--badge-success-text)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                                  >
                                    <CheckCircle size={13} /> Approve
                                  </button>
                                  <button
                                    onClick={() => reject(e.id)} disabled={acting === e.id}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                                  >
                                    <XCircle size={13} /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="t-text-secondary" style={{ fontSize: "0.75rem" }}>—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* Paid salary rows — shown as expense entries */}
                      {paidSalaries.map((p: any) => (
                        <tr key={`sal-${p.id}`} style={{ background: "rgba(99,102,241,0.04)" }}>
                          <td>
                            <p className="t-text-primary font-medium">
                              {staffMap[p.staff_id] ? `Salary — ${staffMap[p.staff_id]}` : `Salary — Staff #${p.staff_id}`}
                            </p>
                            {(Number(p.deductions) > 0 || Number(p.bonuses) > 0) && (
                              <p className="t-text-secondary" style={{ fontSize: "0.72rem" }}>
                                Base: {fmt(Number(p.salary_amount))}
                                {Number(p.deductions) > 0 && ` · Deductions: -${fmt(Number(p.deductions))}`}
                                {Number(p.bonuses) > 0 && ` · Bonus: +${fmt(Number(p.bonuses))}`}
                              </p>
                            )}
                          </td>
                          <td>
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600, background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                              Salary
                            </span>
                          </td>
                          <td style={{ color: "#6366f1", fontWeight: 600 }}>{fmt(Number(p.net_salary))}</td>
                          <td className="t-text-secondary">
                            {p.payment_date
                              ? new Date(p.payment_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
                              <CheckCircle size={11} /> PAID
                            </span>
                          </td>
                          {approver && <td><span className="t-text-secondary" style={{ fontSize: "0.75rem" }}>—</span></td>}
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Month total footer */}
            {(monthExpenses.length > 0 || paidSalaries.length > 0) && (
              <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--accent-light)", display: "flex", flexWrap: "wrap", gap: 20 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {MONTHS[month - 1]} {year} total:
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Expenses: <b style={{ color: "#ef4444" }}>{fmt(totalExpenses)}</b>
                </span>
                {paidSalaries.length > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Salaries: <b style={{ color: "#6366f1" }}>{fmt(totalSalaries)}</b>
                  </span>
                )}
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Total: <b style={{ color: "#f59e0b" }}>{fmt(totalOutgoings)}</b>
                </span>
                {pendingCount > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Pending approval: <b style={{ color: "#f59e0b" }}>{pendingCount}</b>
                  </span>
                )}
              </div>
            )}
          </div>}
        </>
      )}

      {/* ======== SALARY PAYMENTS TAB ======== */}
      {tab === "salaries" && (
        <div className="t-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="t-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Base Salary</th>
                  <th>Deductions</th>
                  <th>Bonuses</th>
                  <th>Net Paid</th>
                  <th>Date Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0" }}>Loading…</td></tr>
                ) : payrolls.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="t-empty"><p>No salary records for {MONTHS[month - 1]} {year}.</p></div>
                  </td></tr>
                ) : payrolls.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <p className="t-text-primary font-medium">
                        {staffMap[p.staff_id] || `Staff #${p.staff_id}`}
                      </p>
                    </td>
                    <td className="t-text-primary">{fmt(Number(p.salary_amount))}</td>
                    <td style={{ color: Number(p.deductions) > 0 ? "#ef4444" : "var(--text-secondary)" }}>
                      {Number(p.deductions) > 0 ? `-${fmt(Number(p.deductions))}` : "–"}
                    </td>
                    <td style={{ color: Number(p.bonuses) > 0 ? "#22c55e" : "var(--text-secondary)" }}>
                      {Number(p.bonuses) > 0 ? `+${fmt(Number(p.bonuses))}` : "–"}
                    </td>
                    <td style={{ fontWeight: 700, color: "#10b981" }}>{fmt(Number(p.net_salary))}</td>
                    <td className="t-text-secondary">
                      {p.payment_date
                        ? new Date(p.payment_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                        : "–"}
                    </td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600,
                        background: p.payment_status === "PAID" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                        color: p.payment_status === "PAID" ? "#16a34a" : "#d97706",
                      }}>
                        {p.payment_status === "PAID" && <CheckCircle size={11} />}
                        {p.payment_status === "PAID" ? "Paid" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paidSalaries.length > 0 && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--accent-light)", display: "flex", gap: 20 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {MONTHS[month - 1]} {year} salaries:
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Total disbursed: <b style={{ color: "#10b981" }}>{fmt(totalSalaries)}</b>
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {paidSalaries.length} of {payrolls.length} paid
              </span>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

const navBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
