"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getRole } from "@/lib/auth";
import { Mail, Eye, EyeOff, Users, KeyRound, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "badge-green", PRINCIPAL: "badge-yellow", ADMIN: "badge-blue",
  TEACHER: "badge-blue", PARENT: "badge-green", STUDENT: "badge-blue",
  NON_TEACHING_STAFF: "badge-yellow",
};

const roleDisplayName: Record<string, string> = {
  SUPER_ADMIN: "Proprietor", PRINCIPAL: "Vice Principal", ADMIN: "Principal",
  TEACHER: "Teacher", PARENT: "Parent", STUDENT: "Student",
  NON_TEACHING_STAFF: "Staff",
};

export default function SettingsPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const r = getRole();
    if (r === "SUPER_ADMIN") {
      setIsSuperAdmin(true);
      api.get("/api/v1/users/").then(res => setUsers(res.data.data || [])).catch(() => {});
    }
  }, []);

  const resetPassword = async () => {
    if (!newPw || newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setResetting(true);
    try {
      await api.post(`/api/v1/users/${resetTarget.id}/reset-password`, { new_password: newPw });
      toast.success(`Password reset for ${resetTarget.email}`);
      setResetTarget(null);
      setNewPw("");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to reset password");
    }
    setResetting(false);
  };

  const [config, setConfig] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    from_name: "School Management System",
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ provider: string; from: string | null } | null>(null);

  useEffect(() => {
    api.get("/api/v1/email-config/status").then(res => setEmailStatus(res.data.data)).catch(() => {});
    api.get("/api/v1/email-config/").then(res => {
      const d = res.data.data;
      setConfig(c => ({ ...c, smtp_host: d.smtp_host, smtp_port: d.smtp_port, smtp_user: d.smtp_user, from_name: d.from_name }));
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/v1/email-config/", config);
      toast.success("Email configuration saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    }
    setSaving(false);
  };

  const test = async () => {
    if (!testEmail) { toast.error("Enter a test email"); return; }
    setTesting(true);
    try {
      await api.post(`/api/v1/email-config/test?to_email=${encodeURIComponent(testEmail)}`);
      toast.success(`Test email sent to ${testEmail}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed — check SMTP credentials");
    }
    setTesting(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Settings</h1>
        <p className="t-text-secondary text-sm mt-1">Configure school email service</p>
      </div>

      <div className="max-w-lg">
        {emailStatus && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-4 text-sm font-medium ${
            emailStatus.provider === "resend"
              ? "bg-green-50 text-green-800 border border-green-200"
              : emailStatus.provider === "smtp"
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {emailStatus.provider === "resend" && <CheckCircle size={16} className="shrink-0" />}
            {emailStatus.provider === "smtp" && <AlertCircle size={16} className="shrink-0" />}
            {emailStatus.provider === "none" && <XCircle size={16} className="shrink-0" />}
            <span>
              {emailStatus.provider === "resend" && <>Email active via <strong>Resend API</strong> — sending from {emailStatus.from}</>}
              {emailStatus.provider === "smtp" && <>Email active via <strong>SMTP</strong> — sending from {emailStatus.from}</>}
              {emailStatus.provider === "none" && <>No email provider configured — emails will not be sent</>}
            </span>
          </div>
        )}

        <div className="t-card">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={20} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold t-text-primary">Email (SMTP) Configuration</h2>
          </div>
          {emailStatus?.provider === "resend" && (
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              Resend API is active and takes priority. These SMTP settings are used as a fallback if Resend is ever removed.
            </p>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="t-label">SMTP Host</label>
                <input className="t-input" value={config.smtp_host}
                  onChange={e => setConfig(c => ({ ...c, smtp_host: e.target.value }))} />
              </div>
              <div>
                <label className="t-label">SMTP Port</label>
                <input className="t-input" type="number" value={config.smtp_port}
                  onChange={e => setConfig(c => ({ ...c, smtp_port: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <label className="t-label">Email Address (school email)</label>
              <input className="t-input" type="email" placeholder="hopehillsacademy@gmail.com"
                value={config.smtp_user}
                onChange={e => setConfig(c => ({ ...c, smtp_user: e.target.value }))} />
            </div>

            <div>
              <label className="t-label">Email Password / App Password</label>
              <div className="relative">
                <input
                  className="t-input pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder="Your email password"
                  value={config.smtp_password}
                  onChange={e => setConfig(c => ({ ...c, smtp_password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 t-text-secondary"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs t-text-secondary mt-1">
                For Gmail: use an <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline" style={{ color: "var(--accent)" }}>App Password</a>, not your Gmail password.
              </p>
            </div>

            <div>
              <label className="t-label">From Name</label>
              <input className="t-input" placeholder="School Management System"
                value={config.from_name}
                onChange={e => setConfig(c => ({ ...c, from_name: e.target.value }))} />
            </div>

            <button className="t-btn-primary w-full" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold t-text-primary mb-3">Test Email</h3>
            <div className="flex gap-2">
              <input className="t-input flex-1" type="email" placeholder="test@example.com"
                value={testEmail} onChange={e => setTestEmail(e.target.value)} />
              <button className="t-btn-secondary text-sm shrink-0" onClick={test} disabled={testing}>
                {testing ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="t-card mt-4">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users size={18} style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold t-text-primary">User Management</h2>
            </div>
            <p className="t-text-secondary" style={{ fontSize: "0.8125rem", marginBottom: 14 }}>
              Reset the password for any user account.
            </p>

            {resetTarget && (
              <div style={{ background: "var(--bg-page)", border: "1px solid var(--accent)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                <p className="t-text-primary font-semibold" style={{ fontSize: "0.8125rem", marginBottom: 10 }}>
                  Reset password for <span style={{ color: "var(--accent)" }}>{resetTarget.email}</span>
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      className="t-input"
                      type={showPw ? "text" : "password"}
                      style={{ paddingRight: 40 }}
                      placeholder="New password (min. 6 chars)"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button className="t-btn-primary" style={{ fontSize: "0.75rem", padding: "7px 14px", whiteSpace: "nowrap" }} onClick={resetPassword} disabled={resetting}>
                    {resetting ? "Saving..." : "Set Password"}
                  </button>
                  <button className="t-btn-secondary" style={{ fontSize: "0.75rem", padding: "7px 10px" }} onClick={() => { setResetTarget(null); setNewPw(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {users.map((u: any) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-page)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="t-text-primary" style={{ fontSize: "0.8125rem" }}>{u.email}</span>
                    <span className={roleColors[u.role] || "badge-blue"} style={{ fontSize: "0.7rem" }}>{roleDisplayName[u.role] || u.role}</span>
                    {!u.is_active && <span className="badge-red" style={{ fontSize: "0.7rem" }}>Inactive</span>}
                  </div>
                  <button
                    onClick={() => { setResetTarget(u); setNewPw(""); setShowPw(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
                  >
                    <KeyRound size={12} /> Reset Password
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="t-card mt-4">
          <h2 className="font-semibold t-text-primary mb-3">Auto Email Triggers</h2>
          <div className="space-y-2 text-sm">
            {[
              "✅ Login credentials sent when staff/parent account created",
              "✅ Fee reminder sent to parents when invoice is generated",
              "✅ Result notification sent when results are published",
              "✅ Discipline alert sent to parent when record is created",
            ].map((item) => (
              <p key={item} className="t-text-secondary">{item}</p>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
