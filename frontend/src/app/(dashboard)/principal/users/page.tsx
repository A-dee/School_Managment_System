"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Search, KeyRound, X, Eye, EyeOff, RefreshCw, Copy, CheckCircle, ShieldAlert } from "lucide-react";

const roleLabel: Record<string, string> = {
  SUPER_ADMIN:        "Proprietor",
  PRINCIPAL:          "Vice Principal",
  ADMIN:              "Principal",
  TEACHER:            "Teacher",
  PARENT:             "Parent",
  STUDENT:            "Student",
  NON_TEACHING_STAFF: "Staff",
};

const roleBadge: Record<string, string> = {
  SUPER_ADMIN:        "badge-blue",
  PRINCIPAL:          "badge-blue",
  ADMIN:              "badge-blue",
  TEACHER:            "badge-green",
  PARENT:             "badge-yellow",
  STUDENT:            "badge-yellow",
  NON_TEACHING_STAFF: "badge-yellow",
};

function generatePassword(len = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function UsersPage() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  /* modal state */
  const [target,      setTarget]      = useState<any | null>(null);
  const [adminPwd,    setAdminPwd]    = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [showAdmin,   setShowAdmin]   = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [resetting,   setResetting]   = useState(false);
  const [resetDone,   setResetDone]   = useState(false);
  const [copied,      setCopied]      = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/users/?limit=500");
      setUsers(r.data.data || []);
    } catch { toast.error("Failed to load users"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openModal = (user: any) => {
    setTarget(user);
    setAdminPwd("");
    setNewPwd(generatePassword());
    setShowAdmin(false);
    setShowNew(true);
    setResetDone(false);
    setCopied(false);
  };

  const closeModal = () => { setTarget(null); setResetDone(false); };

  const doReset = async () => {
    if (!adminPwd.trim()) { toast.error("Enter your admin password"); return; }
    if (newPwd.trim().length < 6) { toast.error("New password must be at least 6 characters"); return; }
    setResetting(true);
    try {
      await api.post(`/api/v1/users/${target.id}/reset-password`, {
        admin_password: adminPwd,
        new_password:   newPwd,
      });
      setResetDone(true);
      toast.success("Password reset successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to reset password");
    }
    setResetting(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter ? u.role === roleFilter : true;
    return matchSearch && matchRole;
  });

  const roles = [...new Set(users.map(u => u.role))].sort();

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">User Accounts</h1>
          <p className="t-page-subtitle">{users.length} accounts · reset passwords securely</p>
        </div>
      </div>

      {/* Filters */}
      <div className="t-card mb-4" style={{ padding: "12px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input className="t-input" style={{ paddingLeft: 30 }} placeholder="Search by email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="t-input" style={{ width: 180 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r} value={r}>{roleLabel[r] || r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="t-card overflow-x-auto">
        <table className="t-table">
          <thead>
            <tr>
              <th>Email / Account</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="flex justify-center py-12"><div className="t-spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="t-empty">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{u.email}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 1 }}>ID #{u.id}</div>
                </td>
                <td>
                  <span className={roleBadge[u.role] || "badge-yellow"} style={{ fontSize: "0.68rem" }}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </td>
                <td>
                  <span className={u.is_active ? "badge-green" : "badge-red"} style={{ fontSize: "0.68rem" }}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {new Date(u.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td>
                  <button
                    onClick={() => openModal(u)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "none", background: "var(--accent-light)", color: "var(--accent)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                  >
                    <KeyRound size={12} /> Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Reset Password Modal ── */}
      {target && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldAlert size={18} style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>Reset Password</h2>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 1 }}>{target.email}</p>
                </div>
              </div>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {!resetDone ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Security notice */}
                  <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "#ef4444" }}>Authentication required.</strong> Enter your own Proprietor password to authorise this action.
                  </div>

                  {/* Admin password */}
                  <div>
                    <label className="t-label">Your Admin Password *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="t-input"
                        type={showAdmin ? "text" : "password"}
                        placeholder="Your login password"
                        value={adminPwd}
                        onChange={e => setAdminPwd(e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        onClick={() => setShowAdmin(v => !v)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                      >
                        {showAdmin ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <label className="t-label" style={{ margin: 0 }}>New Password for {roleLabel[target.role] || target.role} *</label>
                      <button
                        onClick={() => setNewPwd(generatePassword())}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600 }}
                      >
                        <RefreshCw size={11} /> Generate
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="t-input"
                        type={showNew ? "text" : "password"}
                        placeholder="New password (min 6 chars)"
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        style={{ paddingRight: 80 }}
                      />
                      <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4 }}>
                        <button onClick={copyPassword} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                          <Copy size={14} />
                        </button>
                        <button onClick={() => setShowNew(v => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                          {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 5 }}>
                      Copy this password and share it with the user directly.
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button onClick={closeModal} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button
                      onClick={doReset}
                      disabled={resetting || !adminPwd.trim() || newPwd.trim().length < 6}
                      style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: resetting ? 0.7 : 1 }}
                    >
                      <KeyRound size={14} />{resetting ? "Resetting…" : "Reset Password"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Success state */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle size={28} style={{ color: "#16a34a" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", marginBottom: 4 }}>Password Reset Successfully</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Share the new password with <strong>{target.email}</strong></p>
                  </div>

                  {/* Password reveal box */}
                  <div style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "var(--bg-main)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, letterSpacing: 2, color: "var(--text-primary)", flex: 1, wordBreak: "break-all" }}>
                      {newPwd}
                    </span>
                    <button
                      onClick={copyPassword}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: copied ? "rgba(34,197,94,0.1)" : "var(--bg-card)", color: copied ? "#16a34a" : "var(--text-primary)", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem", flexShrink: 0 }}
                    >
                      {copied ? <CheckCircle size={13} /> : <Copy size={13} />}{copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center" }}>
                    This is the only time this password will be shown. Copy it before closing.
                  </p>

                  <button onClick={closeModal} style={{ width: "100%", padding: "9px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
