"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getDashboardPath } from "@/lib/auth";
import Link from "next/link";

const features = [
  {
    icon: "👨‍🎓",
    title: "Student Management",
    desc: "Enroll students, track progress, and manage academic records from one place.",
  },
  {
    icon: "👩‍🏫",
    title: "Staff & Teachers",
    desc: "Manage staff profiles, class assignments, and teacher communications.",
  },
  {
    icon: "💰",
    title: "Finance & Fees",
    desc: "Generate invoices, record payments, and keep your school's finances in order.",
  },
  {
    icon: "📊",
    title: "Results & Grades",
    desc: "Enter and publish student results with ease for every term.",
  },
  {
    icon: "💬",
    title: "Messaging",
    desc: "Communicate directly between staff, parents, and management.",
  },
  {
    icon: "🏫",
    title: "School Portal",
    desc: "Parents and students get dedicated portals to stay connected to the school.",
  },
];

const stats = [
  { value: "360°", label: "School Coverage" },
  { value: "3", label: "User Roles" },
  { value: "∞", label: "Students Supported" },
  { value: "24/7", label: "Always Available" },
];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (role) {
      router.replace(getDashboardPath(role));
      return;
    }
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [router]);

  if (!mounted) return null;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#fff" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          50%  { transform: scale(1.15); opacity: 0.1; }
          100% { transform: scale(1);   opacity: 0.4; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.35s; }
        .delay-4 { animation-delay: 0.5s; }
        .feature-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 28px 24px;
          transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
          cursor: default;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          background: rgba(37,99,235,0.15);
          border-color: rgba(37,99,235,0.45);
        }
        .cta-btn {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          padding: 16px 40px;
          border-radius: 50px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(37,99,235,0.45);
        }
        .cta-btn:hover {
          transform: scale(1.05) translateY(-2px);
          box-shadow: 0 8px 40px rgba(37,99,235,0.6);
        }
        .stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 24px 16px;
          text-align: center;
          transition: background 0.2s;
        }
        .stat-card:hover { background: rgba(37,99,235,0.12); }
        .shimmer-text {
          background: linear-gradient(90deg, #93c5fd 0%, #fff 40%, #93c5fd 60%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3.5s linear infinite;
        }
        .pulse-icon {
          animation: float 3s ease-in-out infinite;
          display: inline-block;
        }
        .nav-link {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #fff; }
      `}</style>

      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10, background: "rgba(15,23,42,0.85)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🏫</span>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>SchoolMS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#stats" className="nav-link">Overview</a>
          <Link href="/login" className="cta-btn" style={{ padding: "10px 24px", fontSize: 14 }}>Sign In</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className={visible ? "fade-up" : ""} style={{ marginBottom: 24 }}>
          <span className="pulse-icon" style={{ fontSize: 72 }}>🏫</span>
        </div>

        <h1 className={`${visible ? "fade-up delay-1" : ""} shimmer-text`} style={{ fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-1.5px" }}>
          School Management<br />Made Simple
        </h1>

        <p className={visible ? "fade-up delay-2" : ""} style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>
          A complete platform to manage students, staff, fees, results, and communications — all in one place.
        </p>

        <div className={visible ? "fade-up delay-3" : ""} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="cta-btn">Get Started →</Link>
          <a href="#features" style={{ display: "inline-block", color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 600, padding: "16px 32px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none", transition: "border-color 0.2s, color 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}>
            See Features
          </a>
        </div>

        {/* Role pills */}
        <div className={visible ? "fade-up delay-4" : ""} style={{ marginTop: 56, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {["Proprietor", "Principal", "Teacher", "Parent", "Student"].map((role, i) => (
            <span key={role} style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 50, padding: "6px 16px", fontSize: 13, color: "#93c5fd", fontWeight: 500, animationDelay: `${0.55 + i * 0.07}s` }}
              className={visible ? "fade-up" : ""}>
              {role}
            </span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section id="stats" style={{ padding: "60px 40px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {stats.map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 36, fontWeight: 800, color: "#60a5fa", marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "60px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 12 }}>Everything your school needs</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>One dashboard. All the tools.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ margin: "0 40px 80px", borderRadius: 24, background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)", padding: "60px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>Ready to get started?</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", marginBottom: 32, fontSize: 16 }}>Sign in to access your school dashboard.</p>
        <Link href="/login" className="cta-btn" style={{ background: "#fff", color: "#1e3a8a" }}>Sign In to Dashboard</Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          <span>🏫</span>
          <span>SchoolMS · School Management System</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
