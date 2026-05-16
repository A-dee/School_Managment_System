"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryToken = params.get("token") || "";

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  const submit = async () => {
    if (!token.trim()) {
      toast.error("Enter the reset token from your email");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset-password", { token: token.trim(), new_password: password });
      setDone(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Reset failed - token may have expired");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "36px 32px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {done ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>OK</div>
              <h2 style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a", marginBottom: 8 }}>Password Reset</h2>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Your password has been updated. You can now log in with your new password.</p>
            </div>
            <button
              onClick={() => router.replace("/login")}
              style={{ width: "100%", padding: "11px", borderRadius: 10, background: "#2563eb", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Go to Login
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a", marginBottom: 6 }}>Set New Password</h2>
            <p style={{ color: "#64748b", fontSize: "0.8125rem", marginBottom: 24 }}>
              Paste the one-time reset token from your email, then choose a new password.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Reset Token</label>
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste token from your email"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="At least 8 characters with letters and numbers"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <button
              onClick={submit}
              disabled={loading}
              style={{ width: "100%", padding: "11px", borderRadius: 10, background: loading ? "#93c5fd" : "#2563eb", color: "#fff", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Saving..." : "Reset Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
