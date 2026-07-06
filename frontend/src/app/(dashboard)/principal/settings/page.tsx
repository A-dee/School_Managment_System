"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getRole } from "@/lib/auth";
import { Mail, Eye, EyeOff, Users, KeyRound, CheckCircle, AlertCircle, XCircle, Server } from "lucide-react";

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

type EmailStatus = { provider: string; from: string | null };
type SmtpConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
};

const defaultSmtpConfig: SmtpConfig = {
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  from_name: "School Management System",
};

export default function SettingsPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPw, setNewPw] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(defaultSmtpConfig);
  const [savingSmtp, setSavingSmtp] = useState(false);

  const loadEmailStatus = async () => {
    try {
      const res = await api.get("/api/v1/email-config/status");
      setEmailStatus(res.data.data);
    } catch {
      setEmailStatus(null);
    }
  };

  const loadSmtpConfig = async () => {
    try {
      const res = await api.get("/api/v1/email-config/");
      const data = res.data.data;
      setSmtpConfig({
        smtp_host: data.smtp_host || defaultSmtpConfig.smtp_host,
        smtp_port: data.smtp_port || defaultSmtpConfig.smtp_port,
        smtp_user: data.smtp_user || "",
        smtp_password: "",
        from_name: data.from_name || defaultSmtpConfig.from_name,
      });
    } catch {
      setSmtpConfig(defaultSmtpConfig);
    }
  };

  useEffect(() => {
    const role = getRole();
    const superAdmin = role === "SUPER_ADMIN";
    setIsSuperAdmin(superAdmin);
    if (superAdmin) {
      api.get("/api/v1/users/").then(res => setUsers(res.data.data || [])).catch(() => {});
      loadSmtpConfig();
    }
    loadEmailStatus();
  }, []);

  const setSmtp = (field: keyof SmtpConfig, value: string | number) => {
    setSmtpConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveSmtpConfig = async () => {
    if (!smtpConfig.smtp_host || !smtpConfig.smtp_user || !smtpConfig.smtp_password || !smtpConfig.from_name) {
      toast.error("Fill in all SMTP fields");
      return;
    }
    setSavingSmtp(true);
    try {
      await api.post("/api/v1/email-config/", smtpConfig);
      toast.success("SMTP configuration saved");
      await loadEmailStatus();
      setSmtpConfig(prev => ({ ...prev, smtp_password: "" }));
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save SMTP settings");
    }
    setSavingSmtp(false);
  };

  const resetPassword = async () => {
    if (!newPw || newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!adminPw) {
      toast.error("Enter your admin password to authorize the reset");
      return;
    }
    setResetting(true);
    try {
      await api.post(`/api/v1/users/${resetTarget.id}/reset-password`, {
        admin_password: adminPw,
        new_password: newPw,
      });
      toast.success(`Password reset for ${resetTarget.email}`);
      setResetTarget(null);
      setNewPw("");
      setAdminPw("");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to reset password");
    }
    setResetting(false);
  };

  const test = async () => {
    if (!testEmail) {
      toast.error("Enter a test email");
      return;
    }
    setTesting(true);
    try {
      await api.post(`/api/v1/email-config/test?to_email=${encodeURIComponent(testEmail)}`);
      toast.success(`Test email sent to ${testEmail}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to send test email");
    }
    setTesting(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Settings</h1>
        <p className="t-text-secondary text-sm mt-1">Email configuration and user management</p>
      </div>

      <div className="max-w-lg">
        {emailStatus && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-4 text-sm font-medium ${
            emailStatus.provider === "resend" ? "bg-green-50 text-green-800 border border-green-200"
            : emailStatus.provider === "smtp" ? "bg-blue-50 text-blue-800 border border-blue-200"
            : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {emailStatus.provider === "resend" && <CheckCircle size={16} className="shrink-0" />}
            {emailStatus.provider === "smtp" && <AlertCircle size={16} className="shrink-0" />}
            {emailStatus.provider === "none" && <XCircle size={16} className="shrink-0" />}
            <span>
              {emailStatus.provider === "resend" && <>Email active via <strong>Resend API</strong> - sending from {emailStatus.from}</>}
              {emailStatus.provider === "smtp" && <>Email active via <strong>SMTP</strong> - sending from {emailStatus.from}</>}
              {emailStatus.provider === "none" && <>No email provider configured - emails will not be sent</>}
            </span>
          </div>
        )}

        {isSuperAdmin && (
          <div className="t-card mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Server size={18} style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold t-text-primary">SMTP Configuration</h2>
            </div>
            <p className="t-text-secondary mb-4" style={{ fontSize: "0.8125rem" }}>
              Configure the outgoing email server used to send account and password reset emails.
            </p>
            <div className="space-y-3">
              <div>
                <label className="t-label">SMTP Host</label>
                <input className="t-input" value={smtpConfig.smtp_host} onChange={e => setSmtp("smtp_host", e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="t-label">SMTP Port</label>
                <input className="t-input" type="number" value={smtpConfig.smtp_port} onChange={e => setSmtp("smtp_port", Number(e.target.value) || 0)} placeholder="587" />
              </div>
              <div>
                <label className="t-label">SMTP Username</label>
                <input className="t-input" value={smtpConfig.smtp_user} onChange={e => setSmtp("smtp_user", e.target.value)} placeholder="noreply@school.com" />
              </div>
              <div>
                <label className="t-label">SMTP Password / App Password</label>
                <input className="t-input" type="password" value={smtpConfig.smtp_password} onChange={e => setSmtp("smtp_password", e.target.value)} placeholder="Enter SMTP password" />
              </div>
              <div>
                <label className="t-label">From Name</label>
                <input className="t-input" value={smtpConfig.from_name} onChange={e => setSmtp("from_name", e.target.value)} placeholder="School Management System" />
              </div>
              <button className="t-btn-primary w-full" onClick={saveSmtpConfig} disabled={savingSmtp}>
                {savingSmtp ? "Saving..." : "Save SMTP Settings"}
              </button>
            </div>
          </div>
        )}

        <div className="t-card">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={20} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold t-text-primary">Test Email</h2>
          </div>
          <div className="flex gap-2">
            <input
              className="t-input flex-1"
              type="email"
              placeholder="Send a test to this address"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && test()}
            />
            <button className="t-btn-primary shrink-0" onClick={test} disabled={testing}>
              {testing ? "Sending..." : "Send Test"}
            </button>
          </div>
        </div>

        <ComposeEmailCard />

        {isSuperAdmin && (
          <div className="t-card mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold t-text-primary">User Management</h2>
            </div>
            <p className="t-text-secondary mb-4" style={{ fontSize: "0.8125rem" }}>
              Reset the password for any user account.
            </p>

            {resetTarget && (
              <div style={{ background: "var(--bg-page)", border: "1px solid var(--accent)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                <p className="t-text-primary font-semibold" style={{ fontSize: "0.8125rem", marginBottom: 10 }}>
                  Reset password for <span style={{ color: "var(--accent)" }}>{resetTarget.email}</span>
                </p>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ position: "relative" }}>
                    <input
                      className="t-input"
                      type={showPw ? "text" : "password"}
                      style={{ paddingRight: 40 }}
                      placeholder="New password (min. 8 chars)"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <input
                    className="t-input"
                    type="password"
                    placeholder="Your super admin password"
                    value={adminPw}
                    onChange={e => setAdminPw(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="t-btn-primary" style={{ fontSize: "0.75rem", padding: "7px 14px", whiteSpace: "nowrap" }} onClick={resetPassword} disabled={resetting}>
                      {resetting ? "Saving..." : "Set Password"}
                    </button>
                    <button className="t-btn-secondary" style={{ fontSize: "0.75rem", padding: "7px 10px" }} onClick={() => { setResetTarget(null); setNewPw(""); setAdminPw(""); }}>
                      Cancel
                    </button>
                  </div>
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
                    onClick={() => { setResetTarget(u); setNewPw(""); setAdminPw(""); setShowPw(false); }}
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
              "Account credentials are emailed when staff, parent, user, and new student accounts are created",
              "Forgot Password emails a one-time reset token and reset link",
              "Fee reminders and result notifications use the configured email provider",
              "SMTP can be configured directly on this page by a super admin",
            ].map((item) => (
              <p key={item} className="t-text-secondary">{item}</p>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ComposeEmailCard() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to || !subject || !body) {
      toast.error("Fill in all fields");
      return;
    }
    setSending(true);
    try {
      await api.post("/api/v1/email-config/compose", { to_email: to, subject, body });
      toast.success(`Email sent to ${to}`);
      setTo("");
      setSubject("");
      setBody("");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to send email");
    }
    setSending(false);
  };

  return (
    <div className="t-card mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Mail size={18} style={{ color: "var(--accent)" }} />
        <h2 className="font-semibold t-text-primary">Compose and Send Email</h2>
      </div>
      <div className="space-y-3">
        <div>
          <label className="t-label">To</label>
          <input className="t-input" type="email" placeholder="recipient@example.com" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label className="t-label">Subject</label>
          <input className="t-input" placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="t-label">Message</label>
          <textarea className="t-input" rows={5} placeholder="Write your message here..." value={body} onChange={e => setBody(e.target.value)} style={{ resize: "vertical" }} />
        </div>
        <button className="t-btn-primary w-full" onClick={send} disabled={sending}>
          {sending ? "Sending..." : "Send Email"}
        </button>
      </div>
    </div>
  );
}
