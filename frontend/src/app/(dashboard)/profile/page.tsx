"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { getRole } from "@/lib/auth";
import { Eye, EyeOff, Lock, UserCircle } from "lucide-react";

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Proprietor", PRINCIPAL: "Vice Principal", ADMIN: "Principal",
  TEACHER: "Teacher", PARENT: "Parent", STUDENT: "Student",
  NON_TEACHING_STAFF: "Non-Teaching Staff",
};

export default function ProfilePage() {
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRole(getRole() || "");
    api.get("/api/v1/auth/me").then(r => setEmail(r.data.data?.email || "")).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const changePassword = async () => {
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      toast.error("Fill all fields"); return;
    }
    if (form.new_password !== form.confirm_password) {
      toast.error("New passwords do not match"); return;
    }
    if (form.new_password.length < 6) {
      toast.error("New password must be at least 6 characters"); return;
    }
    setSaving(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success("Password changed successfully");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to change password");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">My Profile</h1>
          <p className="t-page-subtitle">Manage your account settings</p>
        </div>
      </div>

      <div style={{ maxWidth: 480 }}>
        {/* Account info */}
        <div className="t-card mb-4">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserCircle size={28} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="t-text-primary font-semibold">{email || "—"}</p>
              <span className="badge-blue" style={{ marginTop: 4 }}>{roleLabel[role] || role}</span>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="t-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Lock size={18} style={{ color: "var(--accent)" }} />
            <h2 className="font-semibold t-text-primary">Change Password</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="t-label">Current Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  className="t-input"
                  type={showCurrent ? "text" : "password"}
                  style={{ paddingRight: 40 }}
                  placeholder="Enter current password"
                  value={form.current_password}
                  onChange={e => set("current_password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="t-label">New Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  className="t-input"
                  type={showNew ? "text" : "password"}
                  style={{ paddingRight: 40 }}
                  placeholder="Min. 6 characters"
                  value={form.new_password}
                  onChange={e => set("new_password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="t-label">Confirm New Password *</label>
              <input
                className="t-input"
                type="password"
                placeholder="Repeat new password"
                value={form.confirm_password}
                onChange={e => set("confirm_password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && changePassword()}
              />
            </div>
          </div>

          <button
            className="t-btn-primary"
            style={{ marginTop: 20, width: "100%" }}
            onClick={changePassword}
            disabled={saving}
          >
            {saving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
