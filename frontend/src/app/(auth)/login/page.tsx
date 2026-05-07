"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { login } from "@/lib/api";
import { setTokens, setRole, getDashboardPath } from "@/lib/auth";
import { Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

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
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-bg {
          position: fixed; inset: 0; z-index: 0;
          background: linear-gradient(135deg,
            #dbeafe 0%, #ede9fe 25%, #d1fae5 55%, #fef9c3 80%, #fce7f3 100%
          );
        }
        .blob {
          position: fixed; border-radius: 50%;
          filter: blur(72px); pointer-events: none;
          animation: blobDrift 20s ease-in-out infinite;
        }
        .b1 { width:500px;height:500px;background:rgba(96,165,250,0.45);top:-120px;left:-120px;animation-duration:22s; }
        .b2 { width:420px;height:420px;background:rgba(167,139,250,0.38);top:-40px;right:-80px;animation-duration:28s;animation-delay:-9s; }
        .b3 { width:400px;height:400px;background:rgba(52,211,153,0.30);bottom:-100px;left:20%;animation-duration:25s;animation-delay:-5s; }
        .b4 { width:300px;height:300px;background:rgba(251,191,36,0.35);bottom:5%;right:5%;animation-duration:30s;animation-delay:-14s; }
        @keyframes blobDrift {
          0%,100% { transform:translate(0,0) scale(1); }
          33%      { transform:translate(22px,-30px) scale(1.05); }
          66%      { transform:translate(-15px,20px) scale(0.97); }
        }

        .login-glass {
          background: rgba(255,255,255,0.65);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 2px solid rgba(255,255,255,0.85);
          border-radius: 28px;
          box-shadow: 0 24px 80px rgba(100,116,139,0.18), 0 1px 0 rgba(255,255,255,1) inset;
        }

        .login-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1.5px solid rgba(203,213,225,0.8);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(8px);
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: rgba(255,255,255,0.95);
        }
        .login-input-err { border-color: #ef4444 !important; }

        .login-btn {
          width: 100%;
          padding: 12px;
          border-radius: 50px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff;
          font-weight: 700;
          font-size: 0.9375rem;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .login-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(37,99,235,0.5); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .grad-text {
          background: linear-gradient(135deg, #1d4ed8, #7c3aed, #059669);
          background-size: 200% 200%;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradShift 5s ease infinite;
        }
        @keyframes gradShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }

        @keyframes floatLogo {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        .logo-float { animation: floatLogo 4s ease-in-out infinite; }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .d1 { animation-delay: 0.1s; }
        .d2 { animation-delay: 0.22s; }
        .d3 { animation-delay: 0.36s; }

        @keyframes spin { to { transform: rotate(360deg); } }

        .role-chip {
          background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
          border: 1.5px solid rgba(255,255,255,0.9);
          border-radius: 50px; padding: 4px 13px;
          font-size: 11.5px; font-weight: 600; color: #475569;
          white-space: nowrap;
        }
      `}</style>

      {/* Background */}
      <div className="login-bg" />
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="blob b4" />

      {/* Back to home */}
      <div style={{ position: "fixed", top: 20, left: 24, zIndex: 10 }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255,255,255,0.85)", borderRadius: 50,
          padding: "7px 16px", textDecoration: "none",
          color: "#475569", fontSize: 13, fontWeight: 600,
          boxShadow: "0 2px 12px rgba(100,116,139,0.12)",
          transition: "background 0.2s",
        }}>
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      {/* Centered card */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div className="login-glass fade-up" style={{ width: "100%", maxWidth: 440, padding: "44px 40px 36px", position: "relative", overflow: "hidden" }}>
          {/* Shine line */}
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 2, background: "linear-gradient(90deg,transparent,rgba(255,255,255,1),transparent)" }} />
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%", background: "rgba(96,165,250,0.12)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(167,139,250,0.12)", pointerEvents: "none" }} />

          {/* Logo */}
          <div className="logo-float fade-up" style={{ display: "flex", justifyContent: "center", marginBottom: 22, position: "relative" }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 12, boxShadow: "0 8px 32px rgba(37,99,235,0.18), 0 2px 0 rgba(255,255,255,1)", display: "inline-flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt="Hope Hills Academy" style={{ width: 64, height: 64, objectFit: "contain", display: "block" }} />
            </div>
          </div>

          {/* Heading */}
          <div className="fade-up d1" style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
            <h1 className="grad-text" style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.15, marginBottom: 4 }}>
              Hope Hills Academy
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.82rem", fontStyle: "italic", marginBottom: 6 }}>Excellence in Early Childhood Education</p>
            <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Sign in to access your portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="fade-up d2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Email Address</label>
              <input
                type="email"
                placeholder="your@email.com"
                className={`login-input${errors.email ? " login-input-err" : ""}`}
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p style={{ color: "#ef4444", fontSize: "0.73rem", marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className={`login-input${errors.password ? " login-input-err" : ""}`}
                  style={{ paddingRight: 44 }}
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: "#ef4444", fontSize: "0.73rem", marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 4 }}>
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
              style={{ background: "none", border: "none", color: "#6366f1", fontSize: "0.8rem", cursor: "pointer", textAlign: "center", fontWeight: 600 }}
            >
              Forgot your password?
            </button>
          </form>

          {/* Role chips */}
          <div className="fade-up d3" style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(203,213,225,0.4)" }}>
            {["Proprietor","Principal","Admin","Teacher","Parent","Student"].map(r => (
              <span key={r} className="role-chip">{r}</span>
            ))}
          </div>

          {/* Privacy */}
          <p className="fade-up d3" style={{ textAlign: "center", marginTop: 16, fontSize: "0.7rem", color: "#94a3b8", lineHeight: 1.6, position: "relative" }}>
            By signing in you acknowledge our{" "}
            <Link href="/privacy" style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
            {" "}and the Nigeria Data Protection Act 2023.
          </p>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="modal-overlay">
          <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(24px)", borderRadius: 20, padding: "28px 28px 24px", width: "100%", maxWidth: 400, border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
            {forgotSent ? (
              <>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 10 }}>Check your email</h3>
                <p style={{ color: "#475569", fontSize: "0.875rem", marginBottom: 20 }}>
                  If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Check your inbox (and spam folder).
                </p>
                <button onClick={() => setForgotOpen(false)} className="login-btn">Done</button>
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
                  className="login-input"
                  style={{ marginBottom: 14 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={sendForgot} disabled={forgotSending} className="login-btn" style={{ flex: 1, borderRadius: 12 }}>
                    {forgotSending ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button onClick={() => setForgotOpen(false)} style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(241,245,249,0.8)", color: "#475569", fontWeight: 600, border: "1.5px solid rgba(203,213,225,0.8)", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
