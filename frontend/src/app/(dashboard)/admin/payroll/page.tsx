"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getRole } from "@/lib/auth";
import {
  CheckCircle, ChevronLeft, ChevronRight,
  Users, DollarSign, Clock, AlertTriangle, Banknote,
} from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt    = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
const typeLabel: Record<string, string> = {
  TEACHER: "Teacher", ADMIN: "Admin", NON_TEACHING: "Non-Teaching", PRINCIPAL: "Principal",
};

type Staff   = { id: number; full_name: string; email: string; staff_type: string; status: string; salary_amount: string };
type Payroll = { id: number; staff_id: number; month: number; year: number; salary_amount: string; deductions: string; bonuses: string; net_salary: string; payment_status: "PENDING"|"PAID"; payment_date: string | null };
type Row     = Staff & { payroll: Payroll | null };
type Tab     = "salaries" | "advance" | "terminations";

export default function PayrollPage() {
  const now  = new Date();
  const role = getRole();
  const isAdmin = role === "ADMIN";

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [tab,   setTab]   = useState<Tab>("salaries");
  const [staffTypeFilter, setStaffTypeFilter] = useState(isAdmin ? "TEACHER" : "");

  /* ---- Salaries tab state ---- */
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId,  setEditId]  = useState<number | null>(null);
  const [editDeduct, setEditDeduct] = useState("0");
  const [editBonus,  setEditBonus]  = useState("0");
  const [paying,  setPaying]  = useState<number | null>(null);

  /* ---- Advance tab state ---- */
  const [allStaff,     setAllStaff]     = useState<Staff[]>([]);
  const [advStaffId,   setAdvStaffId]   = useState("");
  const [advAmount,    setAdvAmount]    = useState("");
  const [advNote,      setAdvNote]      = useState("");
  const [advDate,      setAdvDate]      = useState(now.toISOString().split("T")[0]);
  const [advLoading,   setAdvLoading]   = useState(false);
  const [advances,     setAdvances]     = useState<any[]>([]);

  /* ---- Terminations tab state ---- */
  const [termStaffId,      setTermStaffId]      = useState("");
  const [termDate,         setTermDate]          = useState(now.toISOString().split("T")[0]);
  const [termFinalPay,     setTermFinalPay]      = useState("");
  const [termNote,         setTermNote]          = useState("");
  const [termLoading,      setTermLoading]       = useState(false);
  const [terminations,     setTerminations]      = useState<any[]>([]);

  /* ================================================================ */
  /*  Data loaders                                                     */
  /* ================================================================ */
  const loadSalaries = async () => {
    setLoading(true);
    try {
      const [staffR, payR] = await Promise.all([
        api.get("/api/v1/staff?limit=200"),
        api.get(`/api/v1/finance/payroll?month=${month}&year=${year}`),
      ]);
      const staffList: Staff[]   = staffR.data.data || [];
      const payrolls:  Payroll[] = payR.data.data   || [];
      const payMap = Object.fromEntries(payrolls.map(p => [p.staff_id, p]));
      const active = staffList.filter(s => s.status === "ACTIVE");
      setRows(active.map(s => ({ ...s, payroll: payMap[s.id] ?? null })));
      setAllStaff(staffList);
    } finally { setLoading(false); }
  };

  const loadAdvances = async () => {
    try {
      const res = await api.get("/api/v1/finance/expenditures");
      const all: any[] = res.data.data || [];
      setAdvances(all.filter(e => e.category === "Salary Advance"));
    } catch {}
  };

  const loadTerminations = async () => {
    try {
      const res = await api.get("/api/v1/finance/expenditures");
      const all: any[] = res.data.data || [];
      setTerminations(all.filter(e => e.category === "Termination Payment"));
    } catch {}
  };

  useEffect(() => { loadSalaries(); }, [month, year]);
  useEffect(() => {
    if (tab === "advance")       { if (allStaff.length === 0) loadSalaries(); loadAdvances(); }
    if (tab === "terminations")  { if (allStaff.length === 0) loadSalaries(); loadTerminations(); }
  }, [tab]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  /* ================================================================ */
  /*  Salaries actions                                                 */
  /* ================================================================ */
  const markPaid = async (row: Row) => {
    setPaying(row.id);
    try {
      let pid = row.payroll?.id;
      if (!pid) {
        const deductions = editId === row.id ? parseFloat(editDeduct) || 0 : 0;
        const bonuses    = editId === row.id ? parseFloat(editBonus)  || 0 : 0;
        const res = await api.post("/api/v1/finance/payroll", { staff_id: row.id, month, year, deductions, bonuses });
        pid = res.data.data.id;
      }
      const today = new Date().toISOString().split("T")[0];
      await api.post(`/api/v1/finance/payroll/${pid}/mark-paid`, null, { params: { payment_date: today } });
      setEditId(null);
      await loadSalaries();
      toast.success(`${row.full_name} marked as paid`);
    } catch { toast.error("Failed to mark paid"); }
    finally { setPaying(null); }
  };

  /* ================================================================ */
  /*  Salary Advance actions                                           */
  /* ================================================================ */
  const recordAdvance = async () => {
    if (!advStaffId || !advAmount) { toast.error("Select staff and enter amount"); return; }
    const staff = allStaff.find(s => s.id === parseInt(advStaffId));
    setAdvLoading(true);
    try {
      await api.post("/api/v1/finance/expenditures", {
        title: `Salary Advance — ${staff?.full_name ?? `Staff #${advStaffId}`}`,
        description: advNote || undefined,
        amount: parseFloat(advAmount),
        category: "Salary Advance",
        date: advDate,
      });
      toast.success("Salary advance recorded");
      setAdvStaffId(""); setAdvAmount(""); setAdvNote("");
      setAdvDate(now.toISOString().split("T")[0]);
      loadAdvances();
    } catch { toast.error("Failed to record advance"); }
    setAdvLoading(false);
  };

  /* ================================================================ */
  /*  Termination actions                                              */
  /* ================================================================ */
  const recordTermination = async () => {
    if (!termStaffId) { toast.error("Select a staff member"); return; }
    const staff = allStaff.find(s => s.id === parseInt(termStaffId));
    setTermLoading(true);
    try {
      /* update staff status to INACTIVE */
      await api.put(`/api/v1/staff/${termStaffId}`, { status: "INACTIVE" });

      /* record final payment if provided */
      if (termFinalPay && parseFloat(termFinalPay) > 0) {
        await api.post("/api/v1/finance/expenditures", {
          title: `Termination Payment — ${staff?.full_name ?? `Staff #${termStaffId}`}`,
          description: termNote || undefined,
          amount: parseFloat(termFinalPay),
          category: "Termination Payment",
          date: termDate,
        });
      }

      toast.success(`${staff?.full_name ?? "Staff"} terminated and marked inactive`);
      setTermStaffId(""); setTermFinalPay(""); setTermNote("");
      setTermDate(now.toISOString().split("T")[0]);
      loadSalaries();
      loadTerminations();
    } catch { toast.error("Failed to record termination"); }
    setTermLoading(false);
  };

  /* ================================================================ */
  /*  Summary stats (salaries tab)                                     */
  /* ================================================================ */
  const filteredRows = staffTypeFilter ? rows.filter(r => r.staff_type === staffTypeFilter) : rows;
  const paidRows    = filteredRows.filter(r => r.payroll?.payment_status === "PAID");
  const totalSalary = filteredRows.reduce((s, r) => s + Number(r.salary_amount), 0);
  const totalPaid   = paidRows.reduce((s, r) => s + Number(r.payroll!.net_salary), 0);

  /* ================================================================ */
  return (
    <DashboardLayout>
      {/* ---- Header ---- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="t-text-primary" style={{ fontSize: "1.25rem", fontWeight: 700 }}>Salary &amp; Payroll</h1>
          <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginTop: 2 }}>
            Manage staff salaries, advances, and terminations
          </p>
        </div>

        {tab === "salaries" && (
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
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["salaries",     "Monthly Salaries", <DollarSign size={14} />],
          ["advance",      "Salary Advance",   <Banknote size={14} />],
          ["terminations", "Terminations",     <AlertTriangle size={14} />],
        ] as [Tab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <button
            key={key} onClick={() => setTab(key)}
            style={{
              padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              background: tab === key ? "var(--accent)" : "var(--accent-light)",
              color:      tab === key ? "var(--btn-primary-text)" : "var(--accent)",
              transition: "all 0.12s",
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* TAB: Monthly Salaries                                     */}
      {/* ======================================================== */}
      {tab === "salaries" && (
        <>
          {/* Staff type filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Show:</span>
            {[
              { value: "",              label: "All Staff" },
              { value: "TEACHER",       label: "Teachers" },
              { value: "ADMIN",         label: "Admin" },
              { value: "NON_TEACHING",  label: "Non-Teaching" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStaffTypeFilter(opt.value)}
                style={{
                  padding: "5px 14px", borderRadius: 8, border: "1px solid",
                  borderColor: staffTypeFilter === opt.value ? "var(--accent)" : "var(--border)",
                  background: staffTypeFilter === opt.value ? "var(--accent)" : "transparent",
                  color: staffTypeFilter === opt.value ? "var(--btn-primary-text)" : "var(--text-secondary)",
                  fontSize: "0.775rem", fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
                }}
              >
                {opt.label}
                {opt.value && (
                  <span style={{ marginLeft: 5, opacity: 0.75 }}>
                    ({(opt.value ? rows.filter(r => r.staff_type === opt.value) : rows).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { icon: <Users size={18} />,       label: staffTypeFilter ? `${typeLabel[staffTypeFilter] ?? staffTypeFilter}s` : "Active Staff",  value: filteredRows.length,            color: "#6366f1" },
              { icon: <CheckCircle size={18} />,  label: "Paid",          value: paidRows.length,         color: "#22c55e" },
              { icon: <Clock size={18} />,        label: "Unpaid",        value: filteredRows.length - paidRows.length, color: "#f59e0b" },
              { icon: <DollarSign size={18} />,   label: "Disbursed",     value: fmt(totalPaid),          color: "#10b981" },
              { icon: <DollarSign size={18} />,   label: "Outstanding",   value: fmt(totalSalary - totalPaid), color: "#ef4444" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
                <div style={{ color, marginBottom: 5 }}>{icon}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Employee", "Role", "Base Salary", "Deductions", "Bonuses", "Net Pay", "Status", "Date Paid", "Action"].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>Loading…</td></tr>
                  ) : filteredRows.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                      {staffTypeFilter ? `No active ${typeLabel[staffTypeFilter] ?? staffTypeFilter}s found` : "No active staff found"}
                    </td></tr>
                  ) : filteredRows.map(row => {
                    const p        = row.payroll;
                    const isPaid   = p?.payment_status === "PAID";
                    const isEdit   = editId === row.id;
                    const deductions = isEdit ? (parseFloat(editDeduct) || 0) : (p ? Number(p.deductions) : 0);
                    const bonuses    = isEdit ? (parseFloat(editBonus)  || 0) : (p ? Number(p.bonuses)    : 0);
                    const netPrev    = Number(row.salary_amount) + bonuses - deductions;

                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid var(--border)", background: isPaid ? "rgba(34,197,94,0.04)" : "transparent" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.full_name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{row.email}</div>
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{typeLabel[row.staff_type] ?? row.staff_type}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--text-primary)" }}>{fmt(row.salary_amount)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          {isEdit && !isPaid
                            ? <input type="number" min={0} value={editDeduct} onChange={e => setEditDeduct(e.target.value)} style={{ ...miniInp, width: 90 }} />
                            : <span style={{ color: deductions > 0 ? "#ef4444" : "var(--text-secondary)" }}>{deductions > 0 ? `-${fmt(deductions)}` : "–"}</span>
                          }
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {isEdit && !isPaid
                            ? <input type="number" min={0} value={editBonus} onChange={e => setEditBonus(e.target.value)} style={{ ...miniInp, width: 90 }} />
                            : <span style={{ color: bonuses > 0 ? "#22c55e" : "var(--text-secondary)" }}>{bonuses > 0 ? `+${fmt(bonuses)}` : "–"}</span>
                          }
                        </td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#10b981" }}>{fmt(p ? p.net_salary : netPrev)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
                            background: isPaid ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                            color: isPaid ? "#16a34a" : "#d97706",
                          }}>
                            {isPaid && <CheckCircle size={11} />}
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                          {p?.payment_date ? new Date(p.payment_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "–"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {isPaid ? (
                            <span style={{ fontSize: "0.75rem", color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle size={13} /> Done
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                              {!isEdit && (
                                <button onClick={() => { setEditId(row.id); setEditDeduct(p ? String(Number(p.deductions)) : "0"); setEditBonus(p ? String(Number(p.bonuses)) : "0"); }} style={outlineBtn}>
                                  Adjust
                                </button>
                              )}
                              <button
                                onClick={() => markPaid(row)} disabled={paying === row.id}
                                style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", opacity: paying === row.id ? 0.6 : 1 }}
                              >
                                {paying === row.id ? "…" : "Mark Paid"}
                              </button>
                              {isEdit && <button onClick={() => setEditId(null)} style={outlineBtn}>Cancel</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 0 && (
              <div style={{ display: "flex", gap: 24, padding: "11px 14px", borderTop: "2px solid var(--border)", background: "var(--accent-light)", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{MONTHS[month - 1]} {year}:</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total payroll: <b style={{ color: "var(--text-primary)" }}>{fmt(totalSalary)}</b></span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Paid out: <b style={{ color: "#16a34a" }}>{fmt(totalPaid)}</b></span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Remaining: <b style={{ color: "#dc2626" }}>{fmt(totalSalary - totalPaid)}</b></span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{paidRows.length} of {filteredRows.length} {staffTypeFilter ? (typeLabel[staffTypeFilter] ?? staffTypeFilter) + "s" : "staff"} paid</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB: Salary Advance                                       */}
      {/* ======================================================== */}
      {tab === "advance" && (
        <>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 14 }} className="t-text-primary">
              Record Salary Advance
            </h2>
            <p className="t-text-secondary" style={{ fontSize: "0.8rem", marginBottom: 14 }}>
              Use this when a staff member receives part of their salary before the end of the month.
              The advance is logged as an expense and deducted from their end-of-month pay.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="t-label">Staff Member *</label>
                <select value={advStaffId} onChange={e => setAdvStaffId(e.target.value)} className="t-input">
                  <option value="">Select staff…</option>
                  {allStaff.filter(s => s.status === "ACTIVE").map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({typeLabel[s.staff_type] ?? s.staff_type}) — {fmt(s.salary_amount)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-label">Advance Amount (₦) *</label>
                <input type="number" min={0} placeholder="0.00" value={advAmount} onChange={e => setAdvAmount(e.target.value)} className="t-input" />
              </div>
              <div>
                <label className="t-label">Date</label>
                <input type="date" value={advDate} onChange={e => setAdvDate(e.target.value)} className="t-input" />
              </div>
              <div>
                <label className="t-label">Note (optional)</label>
                <input type="text" placeholder="Reason for advance…" value={advNote} onChange={e => setAdvNote(e.target.value)} className="t-input" />
              </div>
            </div>
            <button
              onClick={recordAdvance} disabled={advLoading}
              style={{ marginTop: 14, padding: "7px 20px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--btn-primary-text)", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", opacity: advLoading ? 0.6 : 1 }}
            >
              {advLoading ? "Recording…" : "Record Advance"}
            </button>
          </div>

          {/* Advance history */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.8rem" }} className="t-text-primary">
              Advance History
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Staff", "Amount", "Date", "Note", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {advances.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "30px 0", textAlign: "center", color: "var(--text-secondary)" }}>No salary advances recorded yet</td></tr>
                  ) : advances.map((a: any) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", color: "var(--text-primary)" }}>{a.title.replace("Salary Advance — ", "")}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f59e0b" }}>{fmt(Number(a.amount))}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{a.date}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{a.description || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
                          background: a.approval_status === "APPROVED" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                          color: a.approval_status === "APPROVED" ? "#16a34a" : "#d97706",
                        }}>
                          {a.approval_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB: Terminations                                         */}
      {/* ======================================================== */}
      {tab === "terminations" && (
        <>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }} className="t-text-primary">
              Terminate a Staff Member
            </h2>
            <p className="t-text-secondary" style={{ fontSize: "0.8rem", marginBottom: 14 }}>
              This marks the staff as inactive. You can also record a final/severance payment at the same time.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="t-label">Staff Member *</label>
                <select value={termStaffId} onChange={e => setTermStaffId(e.target.value)} className="t-input">
                  <option value="">Select staff…</option>
                  {allStaff.filter(s => s.status === "ACTIVE").map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({typeLabel[s.staff_type] ?? s.staff_type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-label">Termination Date</label>
                <input type="date" value={termDate} onChange={e => setTermDate(e.target.value)} className="t-input" />
              </div>
              <div>
                <label className="t-label">Final / Severance Payment (₦) — optional</label>
                <input type="number" min={0} placeholder="0.00" value={termFinalPay} onChange={e => setTermFinalPay(e.target.value)} className="t-input" />
              </div>
              <div>
                <label className="t-label">Reason / Note</label>
                <input type="text" placeholder="Reason for termination…" value={termNote} onChange={e => setTermNote(e.target.value)} className="t-input" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
              <button
                onClick={recordTermination} disabled={termLoading || !termStaffId}
                style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", opacity: (termLoading || !termStaffId) ? 0.6 : 1 }}
              >
                {termLoading ? "Processing…" : "Terminate Staff"}
              </button>
              <span className="t-text-secondary" style={{ fontSize: "0.75rem" }}>
                This action marks the employee as inactive in the system.
              </span>
            </div>
          </div>

          {/* Termination log */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.8rem" }} className="t-text-primary">
              Termination &amp; Final Payment Log
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Staff", "Final Payment", "Date", "Note", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {terminations.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "30px 0", textAlign: "center", color: "var(--text-secondary)" }}>No terminations recorded yet</td></tr>
                  ) : terminations.map((t: any) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", color: "var(--text-primary)" }}>{t.title.replace("Termination Payment — ", "")}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#ef4444" }}>{fmt(Number(t.amount))}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{t.date}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{t.description || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
                          background: t.approval_status === "APPROVED" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                          color: t.approval_status === "APPROVED" ? "#16a34a" : "#d97706",
                        }}>
                          {t.approval_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

const navBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const miniInp: React.CSSProperties = {
  padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "0.8125rem",
};
const outlineBtn: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
  background: "transparent", color: "var(--text-primary)", fontSize: "0.75rem", cursor: "pointer",
};
