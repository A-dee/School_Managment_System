"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, ShieldAlert, Eye, EyeOff } from "lucide-react";

export default function ResetSuperAdminPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast.error("Password cannot be empty");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset-superadmin-password", {
        new_password: newPassword,
      });

      toast.success("Super Admin password reset successfully");
      
      // Auto-logout and redirect
      clearTokens();
      router.replace("/login");
    } catch (err: any) {
      let msg = err?.response?.data?.detail;
      if (Array.isArray(msg)) {
        msg = msg.map((e: any) => e.msg).join(", ");
      } else if (typeof msg === "object" && msg !== null) {
        msg = JSON.stringify(msg);
      }
      msg = msg || "Failed to reset password. Please check your credentials or permissions.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        padding: "20px 0",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 450,
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)",
          padding: "32px 28px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Header Accent */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, var(--accent) 0%, #3b82f6 100%)",
          }} />

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(79, 70, 229, 0.1)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <KeyRound size={28} />
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              Super Admin Password Recovery
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Enter and confirm your new administrator password. You will be logged out automatically after a successful reset.
            </p>
          </div>

          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* New Password */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 42px 10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}>
                Confirm New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 42px 10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Warning block */}
            <div style={{
              display: "flex",
              gap: 10,
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              borderRadius: 8,
              padding: 12,
            }}>
              <div style={{ color: "#ef4444", flexShrink: 0 }}>
                <ShieldAlert size={16} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "#f87171", margin: 0, lineHeight: 1.4 }}>
                This is a critical administrative action. Changing the Super Admin password affects all high-level system accesses.
              </p>
            </div>

            {/* Reset Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)",
                color: "#fff",
                fontWeight: 650,
                border: "none",
                borderRadius: 8,
                padding: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "Resetting Password..." : "Reset Super Admin Password"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
