"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, getDashboardPath } from "@/lib/auth";
import Link from "next/link";

const SCHOOL = {
  name:    "Hope Hills Academy",
  tagline: "Crèche · Nursery · Primary",
  mission: "At Hope Hills Academy, we are driven by our vision for excellence — this is what keeps us ahead of our competitors.",
  address: "Plot A/MF/5, Mpape 2 Layout, opposite Zenith Bank, Mpape 901101, FCT",
  phones:  ["08065598994", "07052677702"],
  emails:  ["hopehillsacademy@gmail.com", "admission@hopehillsacademy.ng"],
};

const features = [
  { icon: "👨‍🎓", title: "Student Management",    desc: "Enroll students, track progress, manage academic records, and issue report cards from one place.", color: "#3b82f6" },
  { icon: "👩‍🏫", title: "Staff & Teachers",       desc: "Manage staff profiles, class assignments, attendance, and payroll efficiently.", color: "#a855f7" },
  { icon: "💰",   title: "Finance & Fees",         desc: "Generate invoices, record payments, track expenses, and manage scholarship exemptions.", color: "#22c55e" },
  { icon: "📊",   title: "Results & Report Cards", desc: "Enter results and print branded A4 report cards with school letterhead.", color: "#f59e0b" },
  { icon: "💬",   title: "Messaging",              desc: "Communicate directly between staff, parents, and management in real time.", color: "#06b6d4" },
  { icon: "🏫",   title: "Parent & Student Portal",desc: "Parents and students get dedicated portals to stay connected to the school.", color: "#ec4899" },
];

const stats = [
  { value: "360°", label: "School Coverage",    color: "#3b82f6" },
  { value: "7",    label: "User Roles",          color: "#a855f7" },
  { value: "∞",    label: "Students Supported",  color: "#22c55e" },
  { value: "24/7", label: "Always Available",    color: "#f59e0b" },
];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (role) { router.replace(getDashboardPath(role)); return; }
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [router]);

  if (!mounted) return null;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", color: "#fff", overflowX: "hidden", position: "relative" }}>
      <style>{`
        /* ── Global reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Animated gradient background ── */
        body { background: #050818; }
        .bg-root {
          position: fixed; inset: 0; z-index: 0;
          background: radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.22) 0%, transparent 55%),
                      radial-gradient(ellipse at 80% 10%, rgba(168,85,247,0.18) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 90%, rgba(6,182,212,0.15) 0%, transparent 55%),
                      #050818;
        }
        .blob {
          position: fixed; border-radius: 50%; filter: blur(80px); opacity: 0.55; pointer-events: none;
          animation: blobFloat 18s ease-in-out infinite;
        }
        .blob-1 { width: 520px; height: 520px; background: rgba(59,130,246,0.35); top: -120px; left: -120px; animation-duration: 20s; }
        .blob-2 { width: 420px; height: 420px; background: rgba(168,85,247,0.3); top: -80px; right: -100px; animation-duration: 25s; animation-delay: -8s; }
        .blob-3 { width: 480px; height: 480px; background: rgba(6,182,212,0.22); bottom: -100px; left: 30%; animation-duration: 22s; animation-delay: -4s; }
        .blob-4 { width: 300px; height: 300px; background: rgba(236,72,153,0.18); bottom: 10%; right: 5%; animation-duration: 28s; animation-delay: -12s; }

        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -40px) scale(1.06); }
          66%       { transform: translate(-20px, 20px) scale(0.96); }
        }

        /* ── Glassmorphism base ── */
        .glass {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .glass-strong {
          background: rgba(255,255,255,0.09);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 24px;
          box-shadow: 0 16px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .glass-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
          transition: transform 0.28s ease, background 0.28s, border-color 0.28s, box-shadow 0.28s;
        }
        .glass-card:hover {
          transform: translateY(-6px);
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.22);
          box-shadow: 0 12px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        /* ── Navbar glass ── */
        .navbar {
          position: sticky; top: 0; z-index: 100;
          background: rgba(5,8,24,0.65);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px);   }
          50%       { transform: translateY(-10px); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(59,130,246,0.4), 0 8px 40px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 60px rgba(59,130,246,0.7), 0 8px 40px rgba(0,0,0,0.4); }
        }

        .fade-up  { animation: fadeUp 0.75s ease both; }
        .d1 { animation-delay: 0.10s; }
        .d2 { animation-delay: 0.22s; }
        .d3 { animation-delay: 0.36s; }
        .d4 { animation-delay: 0.52s; }
        .d5 { animation-delay: 0.68s; }

        .shimmer-text {
          background: linear-gradient(90deg, #93c5fd 0%, #e0e7ff 35%, #fff 50%, #e0e7ff 65%, #93c5fd 100%);
          background-size: 250% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .logo-float { animation: floatLogo 4s ease-in-out infinite; }
        .logo-glow  { animation: glowPulse 3s ease-in-out infinite; }

        /* ── Buttons ── */
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: #fff; font-size: 16px; font-weight: 700;
          padding: 15px 36px; border-radius: 50px; text-decoration: none;
          box-shadow: 0 4px 24px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: transform 0.22s, box-shadow 0.22s;
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 10px 40px rgba(37,99,235,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.8); font-size: 15px; font-weight: 600;
          padding: 14px 30px; border-radius: 50px; text-decoration: none;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(10px);
          transition: background 0.22s, border-color 0.22s, transform 0.22s;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.13);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-2px);
        }
        .btn-nav {
          display: inline-flex; align-items: center;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff; font-size: 13px; font-weight: 600;
          padding: 9px 22px; border-radius: 50px; text-decoration: none;
          backdrop-filter: blur(8px);
          transition: background 0.2s, transform 0.2s;
        }
        .btn-nav:hover { background: rgba(255,255,255,0.18); transform: scale(1.03); }

        .nav-link { color: rgba(255,255,255,0.65); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }

        /* ── Role pill ── */
        .role-pill {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border-radius: 50px; padding: 6px 16px; font-size: 13px;
          color: rgba(255,255,255,0.8); font-weight: 500;
          transition: background 0.2s, border-color 0.2s;
        }
        .role-pill:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); }

        /* ── Section labels ── */
        .section-label {
          display: inline-block;
          background: rgba(99,102,241,0.18);
          border: 1px solid rgba(99,102,241,0.35);
          border-radius: 50px; padding: 5px 16px;
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #a5b4fc;
          backdrop-filter: blur(8px);
          margin-bottom: 16px;
        }

        /* ── Feature icon bubble ── */
        .feat-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 16px; flex-shrink: 0;
          backdrop-filter: blur(8px);
        }

        /* ── Stat value glow ── */
        .stat-value { font-size: 38px; font-weight: 900; line-height: 1; margin-bottom: 6px; }

        /* ── Divider ── */
        .glass-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 0; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .hero-btns { flex-direction: column; align-items: center; }
          .about-grid { grid-template-columns: 1fr !important; }
          .feat-grid  { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-grid  { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      {/* Animated background */}
      <div className="bg-root" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width: 36, height: 36, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 2 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.3px", lineHeight: 1.2, color: "#fff" }}>{SCHOOL.name}</div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>{SCHOOL.tagline}</div>
            </div>
          </div>
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#about"    className="nav-link">About</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#contact"  className="nav-link">Contact</a>
          </div>
          <Link href="/login" className="btn-nav">Sign In →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px 70px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {/* Glass hero panel */}
        <div className={`glass-strong ${visible ? "fade-up" : ""}`} style={{ maxWidth: 760, width: "100%", padding: "56px 48px 52px", margin: "0 auto", position: "relative", overflow: "hidden" }}>
          {/* Inner shimmer line */}
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />

          {/* Logo */}
          <div className={`logo-float ${visible ? "fade-up" : ""}`} style={{ display: "inline-block", marginBottom: 28 }}>
            <div className="logo-glow" style={{ background: "linear-gradient(135deg, #fff 0%, #e0e7ff 100%)", borderRadius: 20, padding: 12, display: "inline-flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width: 76, height: 76, objectFit: "contain", display: "block" }} />
            </div>
          </div>

          <h1 className={`shimmer-text ${visible ? "fade-up d1" : ""}`} style={{ fontSize: "clamp(32px,5.5vw,58px)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 10 }}>
            {SCHOOL.name}
          </h1>

          <p className={visible ? "fade-up d1" : ""} style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", fontStyle: "italic", marginBottom: 8 }}>
            Excellence in Early Childhood Education
          </p>

          <p className={visible ? "fade-up d2" : ""} style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", marginBottom: 10, fontWeight: 500, letterSpacing: 0.5 }}>
            {SCHOOL.tagline}
          </p>

          <p className={visible ? "fade-up d2" : ""} style={{ fontSize: 14.5, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.8 }}>
            {SCHOOL.mission}
          </p>

          <div className={`hero-btns ${visible ? "fade-up d3" : ""}`} style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            <Link href="/login" className="btn-primary">Access Portal →</Link>
            <a href="#about" className="btn-ghost">Learn More</a>
          </div>

          {/* Role pills */}
          <div className={visible ? "fade-up d4" : ""} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {["Proprietor", "Principal", "Admin", "Teacher", "Parent", "Student"].map((role, i) => (
              <span key={role} className={`role-pill ${visible ? "fade-up" : ""}`} style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
                {role}
              </span>
            ))}
          </div>

          {/* Bottom corner accent */}
          <div style={{ position: "absolute", bottom: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(99,102,241,0.15)", filter: "blur(20px)", pointerEvents: "none" }} />
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 60px" }}>
        <div className={`stats-grid ${visible ? "fade-up d4" : ""}`} style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {stats.map((s) => (
            <div key={s.label} className="glass-card" style={{ padding: "26px 16px", textAlign: "center" }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ position: "relative", zIndex: 1, padding: "60px 24px 70px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
            {/* Left: text */}
            <div className="glass" style={{ padding: "40px 36px" }}>
              <div className="section-label">About Us</div>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 800, letterSpacing: "-0.7px", marginBottom: 18, lineHeight: 1.25 }}>
                Building Leaders of<br />Tomorrow, Today
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14.5, lineHeight: 1.85, marginBottom: 18 }}>
                {SCHOOL.mission}
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13.5, lineHeight: 1.85 }}>
                Located in the heart of Mpape, Abuja, Hope Hills Academy provides a nurturing environment where children from crèche through primary school develop academically, socially, and emotionally.
              </p>
            </div>

            {/* Right: value cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { icon: "🎯", title: "Our Vision",   color: "#6366f1", text: "To raise a generation of well-rounded, confident, and excellent leaders through quality early childhood education." },
                { icon: "📚", title: "Our Approach", color: "#22c55e", text: "A blend of modern teaching methods with strong moral foundations, creating a holistic learning experience for every child." },
                { icon: "🏆", title: "Our Strength", color: "#f59e0b", text: "Dedicated teachers, modern facilities, and a caring community that places every child's success at the centre." },
              ].map(item => (
                <div key={item.title} className="glass-card" style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${item.color}20`, border: `1px solid ${item.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5, color: "#fff" }}>{item.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.7 }}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ position: "relative", zIndex: 1, padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-label">Management Portal</div>
            <h2 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 10 }}>
              Everything {SCHOOL.name} needs
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15 }}>One dashboard. All the tools.</p>
          </div>

          <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {features.map(f => (
              <div key={f.title} className="glass-card" style={{ padding: "30px 26px" }}>
                <div className="feat-icon" style={{ background: `${f.color}18`, border: `1px solid ${f.color}35` }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 10, color: "#fff" }}>{f.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                <div style={{ marginTop: 18, height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${f.color}60, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ position: "relative", zIndex: 1, padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div className="section-label">Get in Touch</div>
            <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 800, letterSpacing: "-0.7px", marginBottom: 10 }}>Contact Us</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14.5 }}>We&apos;d love to hear from you. Reach out to us anytime.</p>
          </div>

          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {[
              {
                icon: "📍", title: "Address", color: "#f59e0b",
                content: (
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13.5, lineHeight: 1.8 }}>
                    Plot A/MF/5, Mpape 2 Layout<br />
                    Opposite Zenith Bank, Mpape<br />
                    901101, Federal Capital Territory
                  </p>
                ),
              },
              {
                icon: "📞", title: "Phone", color: "#22c55e",
                content: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {SCHOOL.phones.map(p => (
                      <a key={p} href={`tel:${p}`} style={{ color: "#4ade80", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>{p}</a>
                    ))}
                  </div>
                ),
              },
              {
                icon: "✉️", title: "Email", color: "#3b82f6",
                content: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {SCHOOL.emails.map(e => (
                      <a key={e} href={`mailto:${e}`} style={{ color: "#60a5fa", fontSize: 13, fontWeight: 500, textDecoration: "none", wordBreak: "break-all" }}>{e}</a>
                    ))}
                  </div>
                ),
              },
            ].map(({ icon, title, color, content }) => (
              <div key={title} className="glass-card" style={{ padding: "28px 24px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                  {icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#fff" }}>{title}</div>
                {content}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="glass-strong" style={{ padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden", background: "rgba(37,99,235,0.15)" }}>
            {/* Accent blobs */}
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(99,102,241,0.2)", filter: "blur(40px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(6,182,212,0.15)", filter: "blur(32px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />

            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width: 60, height: 60, objectFit: "contain", background: "#fff", borderRadius: 16, padding: 6, marginBottom: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 0 40px rgba(99,102,241,0.3)" }} />
              <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>
                Ready to get started?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 32, fontSize: 15.5, maxWidth: 420, margin: "0 auto 32px" }}>
                Sign in to access the {SCHOOL.name} management portal.
              </p>
              <Link href="/login" className="btn-primary" style={{ background: "rgba(255,255,255,0.95)", color: "#1e3a8a", boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>
                Sign In to Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 1 }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(5,8,24,0.7)", backdropFilter: "blur(16px)" }}>
          <div className="footer-grid" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 32px 28px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 32, marginBottom: 0 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width: 30, height: 30, objectFit: "contain", background: "#fff", borderRadius: 7, padding: 2 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{SCHOOL.name}</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12.5, lineHeight: 1.8, maxWidth: 260 }}>
                {SCHOOL.tagline}<br />Excellence in Early Childhood Education
              </p>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Contact</div>
              {SCHOOL.phones.map(p => (
                <a key={p} href={`tel:${p}`} style={{ display: "block", color: "rgba(255,255,255,0.45)", fontSize: 13, textDecoration: "none", marginBottom: 6 }}>{p}</a>
              ))}
              {SCHOOL.emails.map(e => (
                <a key={e} href={`mailto:${e}`} style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: 12, textDecoration: "none", marginBottom: 5, wordBreak: "break-all" }}>{e}</a>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Address</div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12.5, lineHeight: 1.8 }}>
                Plot A/MF/5, Mpape 2 Layout<br />
                Opposite Zenith Bank, Mpape<br />
                901101, FCT, Nigeria
              </span>
            </div>
          </div>

          <div style={{ maxWidth: 1060, margin: "0 auto", padding: "16px 32px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>© {new Date().getFullYear()} {SCHOOL.name}. All rights reserved.</span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>School Management System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
