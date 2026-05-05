"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { login } from "@/lib/api";
import { setTokens, setRole, getDashboardPath } from "@/lib/auth";
import { Eye, EyeOff, LogIn } from "lucide-react";
import api from "@/lib/api";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const sendForgot = async () => {
    if (!forgotEmail) { toast.error("Enter your email"); return; }
    setForgotSending(true);
    try {
      await api.post("/api/v1/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      toast.error("Something went wrong. Try again.");
    }
    setForgotSending(false);
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await login(data.email, data.password);
      const { access_token, refresh_token, role } = res.data;
      setTokens(access_token, refresh_token);
      setRole(role);
      toast.success("Welcome back!");
      router.replace(getDashboardPath(role));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0f172a" }}>
      {/* Left panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)",
          position: "relative",
          overflow: "hidden",
        }}
        className="hidden md:flex"
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", top: "40%", right: "10%", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ position: "relative", textAlign: "center", maxWidth: 360 }}>
          <div style={{ width: 90, height: 90, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hope-hills-logo.png" alt="Hope Hills Academy" style={{ width: 78, height: 78, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>
            Hope Hills Academy
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", marginBottom: 3, fontStyle: "italic" }}>
            Excellence in Early Childhood Education
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8125rem", lineHeight: 1.6, marginBottom: 28 }}>
            Crèche · Nursery · Primary
          </p>

          {/* Contact info */}
          <div style={{ textAlign: "left", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Contact Us</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>📍</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", lineHeight: 1.5 }}>
                  Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape 901101, FCT
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>📞</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>08065598994 · 07052677702</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>✉</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}>hopehillsacademy@gmail.com</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>✉</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}>admission@hopehillsacademy.ng</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["Crèche", "Nursery", "Primary"].map((tag) => (
              <div key={tag} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 12px", color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", background: "#ffffff" }}>
        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hope-hills-logo.png" alt="Hope Hills Academy" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "contain", background: "#fff", border: "1px solid #e5e7eb" }} />
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>Hope Hills Academy</span>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Sign in</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                  fontSize: "0.9rem",
                  color: "#0f172a",
                  background: "#f8fafc",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                {...register("email", {
                  required: "Email is required",
                  onBlur: e => e.target.style.borderColor = errors.email ? "#ef4444" : "#e2e8f0",
                })}
              />
              {errors.email && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 14px",
                    borderRadius: 10,
                    border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                    fontSize: "0.9rem",
                    color: "#0f172a",
                    background: "#f8fafc",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  {...register("password", {
                    required: "Password is required",
                    onBlur: e => e.target.style.borderColor = errors.password ? "#ef4444" : "#e2e8f0",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 10,
                background: loading ? "#93c5fd" : "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9375rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail(""); }}
              style={{ background: "none", border: "none", color: "#2563eb", fontSize: "0.8125rem", cursor: "pointer", textAlign: "center", width: "100%", marginTop: 4 }}
            >
              Forgot your password?
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.75rem", marginTop: 32 }}>
            School Management System &copy; {new Date().getFullYear()}
          </p>

          {forgotOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: "28px 28px 24px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                {forgotSent ? (
                  <>
                    <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 10 }}>Check your email</h3>
                    <p style={{ color: "#475569", fontSize: "0.875rem", marginBottom: 20 }}>
                      If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Check your inbox (and spam folder).
                    </p>
                    <button onClick={() => setForgotOpen(false)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "#2563eb", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 6 }}>Reset Password</h3>
                    <p style={{ color: "#64748b", fontSize: "0.8125rem", marginBottom: 18 }}>Enter your email and we&apos;ll send a reset link.</p>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendForgot()}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", marginBottom: 14, outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={sendForgot} disabled={forgotSending} style={{ flex: 1, padding: "10px", borderRadius: 10, background: forgotSending ? "#93c5fd" : "#2563eb", color: "#fff", fontWeight: 700, border: "none", cursor: forgotSending ? "not-allowed" : "pointer" }}>
                        {forgotSending ? "Sending..." : "Send Reset Link"}
                      </button>
                      <button onClick={() => setForgotOpen(false)} style={{ padding: "10px 16px", borderRadius: 10, background: "#f1f5f9", color: "#475569", fontWeight: 600, border: "none", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
