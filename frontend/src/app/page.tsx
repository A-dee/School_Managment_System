"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, getDashboardPath } from "@/lib/auth";
import Link from "next/link";

const SCHOOL = {
  name:    "Hope Hills Academy",
  tagline: "Crèche · Nursery · Primary",
  mission: "At Hope Hills Academy, we are driven by our vision for excellence — this is what keeps us ahead of our competitors.",
  phones:  ["08065598994", "07052677702"],
  emails:  ["hopehillsacademy@gmail.com", "admission@hopehillsacademy.ng"],
};

const features = [
  { icon: "👨‍🎓", title: "Student Management",    desc: "Enroll students, track progress, manage academic records, and issue report cards.", color: "#3b82f6", bg: "#eff6ff" },
  { icon: "👩‍🏫", title: "Staff & Teachers",       desc: "Manage staff profiles, class assignments, attendance, and payroll efficiently.", color: "#7c3aed", bg: "#f5f3ff" },
  { icon: "💰",   title: "Finance & Fees",         desc: "Generate invoices, record payments, track expenses, and manage scholarship exemptions.", color: "#059669", bg: "#ecfdf5" },
  { icon: "📊",   title: "Results & Report Cards", desc: "Enter results and print branded A4 report cards with school letterhead.", color: "#d97706", bg: "#fffbeb" },
  { icon: "💬",   title: "Messaging",              desc: "Communicate directly between staff, parents, and management in real time.", color: "#0891b2", bg: "#ecfeff" },
  { icon: "🏫",   title: "Parent & Student Portal", desc: "Parents and students get dedicated portals to stay connected to the school.", color: "#db2777", bg: "#fdf2f8" },
];

const stats = [
  { value: "360°", label: "School Coverage",   color: "#2563eb" },
  { value: "7",    label: "User Roles",         color: "#7c3aed" },
  { value: "∞",    label: "Students Supported", color: "#059669" },
  { value: "24/7", label: "Always Available",   color: "#d97706" },
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
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", minHeight: "100vh", position: "relative", overflowX: "hidden", color: "#1e293b" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Bright education background ── */
        .page-bg {
          position: fixed; inset: 0; z-index: 0;
          background: linear-gradient(135deg,
            #dbeafe 0%,
            #ede9fe 25%,
            #d1fae5 55%,
            #fef9c3 80%,
            #fce7f3 100%
          );
        }

        /* ── Animated blobs (bright, colorful) ── */
        .blob {
          position: fixed; border-radius: 50%;
          filter: blur(72px); pointer-events: none;
          animation: blobDrift 20s ease-in-out infinite;
        }
        .blob-1 { width: 560px; height: 560px; background: rgba(96,165,250,0.45); top:-140px; left:-140px; animation-duration:22s; }
        .blob-2 { width: 460px; height: 460px; background: rgba(167,139,250,0.38); top:-60px; right:-100px; animation-duration:28s; animation-delay:-9s; }
        .blob-3 { width: 500px; height: 500px; background: rgba(52,211,153,0.3);  bottom:-120px; left:25%; animation-duration:25s; animation-delay:-5s; }
        .blob-4 { width: 340px; height: 340px; background: rgba(251,191,36,0.35); bottom:5%; right:8%; animation-duration:30s; animation-delay:-14s; }
        .blob-5 { width: 300px; height: 300px; background: rgba(249,115,22,0.22); top:40%; left:5%; animation-duration:24s; animation-delay:-7s; }

        @keyframes blobDrift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(25px,-35px) scale(1.05); }
          66%      { transform: translate(-18px,22px) scale(0.97); }
        }

        /* ── Glassmorphism ── */
        .glass {
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid rgba(255,255,255,0.75);
          border-radius: 24px;
          box-shadow: 0 8px 32px rgba(100,116,139,0.12), 0 1px 0 rgba(255,255,255,0.9) inset;
        }
        .glass-hero {
          background: rgba(255,255,255,0.62);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 2px solid rgba(255,255,255,0.85);
          border-radius: 32px;
          box-shadow: 0 20px 60px rgba(100,116,139,0.18), 0 1px 0 rgba(255,255,255,1) inset;
        }
        .glass-card {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(255,255,255,0.8);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(100,116,139,0.1), 0 1px 0 rgba(255,255,255,0.9) inset;
          transition: transform 0.26s ease, box-shadow 0.26s ease, background 0.26s;
        }
        .glass-card:hover {
          transform: translateY(-6px);
          background: rgba(255,255,255,0.75);
          box-shadow: 0 16px 48px rgba(100,116,139,0.2), 0 1px 0 rgba(255,255,255,1) inset;
        }
        .glass-nav {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1.5px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 20px rgba(100,116,139,0.1);
        }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatLogo {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-10px); }
        }
        @keyframes gradShift {
          0%,100% { background-position:0% 50%; }
          50%     { background-position:100% 50%; }
        }

        .fade-up { animation: fadeUp 0.7s ease both; }
        .d1 { animation-delay:.10s; } .d2 { animation-delay:.22s; }
        .d3 { animation-delay:.36s; } .d4 { animation-delay:.50s; }
        .d5 { animation-delay:.66s; }
        .logo-float { animation: floatLogo 4s ease-in-out infinite; }

        .grad-text {
          background: linear-gradient(135deg,#1d4ed8,#7c3aed,#059669);
          background-size: 200% 200%;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradShift 5s ease infinite;
        }

        /* ── Buttons ── */
        .btn-primary {
          display:inline-flex; align-items:center; gap:8px;
          background: linear-gradient(135deg,#2563eb,#7c3aed);
          color:#fff; font-size:15px; font-weight:700;
          padding:14px 34px; border-radius:50px; text-decoration:none;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          border: 1px solid rgba(255,255,255,0.3);
          transition: transform .22s, box-shadow .22s;
        }
        .btn-primary:hover { transform:translateY(-3px) scale(1.03); box-shadow:0 10px 36px rgba(37,99,235,0.5); }

        .btn-outline {
          display:inline-flex; align-items:center; gap:8px;
          color:#1e293b; font-size:15px; font-weight:600;
          padding:13px 28px; border-radius:50px; text-decoration:none;
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(255,255,255,0.85);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 12px rgba(100,116,139,0.12);
          transition: background .22s, transform .22s;
        }
        .btn-outline:hover { background:rgba(255,255,255,0.85); transform:translateY(-2px); }

        .btn-nav {
          display:inline-flex; align-items:center;
          background:linear-gradient(135deg,#2563eb,#7c3aed);
          color:#fff; font-size:13px; font-weight:700;
          padding:9px 22px; border-radius:50px; text-decoration:none;
          box-shadow: 0 2px 12px rgba(37,99,235,0.35);
          transition: transform .2s, box-shadow .2s;
        }
        .btn-nav:hover { transform:scale(1.04); box-shadow:0 4px 20px rgba(37,99,235,0.45); }

        .nav-link { color:#475569; text-decoration:none; font-size:14px; font-weight:500; transition:color .2s; }
        .nav-link:hover { color:#1e293b; }

        /* ── Misc ── */
        .section-badge {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,0.7); backdrop-filter:blur(8px);
          border:1.5px solid rgba(255,255,255,0.9);
          border-radius:50px; padding:5px 16px;
          font-size:11px; font-weight:700; letter-spacing:1.5px;
          text-transform:uppercase; color:#6366f1;
          box-shadow: 0 2px 8px rgba(99,102,241,0.1);
          margin-bottom:14px;
        }
        .role-pill {
          background:rgba(255,255,255,0.6); backdrop-filter:blur(8px);
          border:1.5px solid rgba(255,255,255,0.85);
          border-radius:50px; padding:6px 16px;
          font-size:12.5px; font-weight:600; color:#334155;
          box-shadow:0 2px 8px rgba(100,116,139,0.08);
          transition: background .2s, transform .2s;
        }
        .role-pill:hover { background:rgba(255,255,255,0.85); transform:scale(1.04); }

        /* Decorative shapes */
        .deco-shape {
          position:absolute; border-radius:50%; pointer-events:none; opacity:0.4;
        }

        @media(max-width:768px){
          .about-grid,.feat-grid,.contact-grid,.footer-cols{ grid-template-columns:1fr !important; }
          .stats-grid{ grid-template-columns:1fr 1fr !important; }
          .nav-links{ display:none !important; }
          .hero-btns{ flex-direction:column; align-items:center; }
        }
        @media(max-width:640px){
          .feat-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* Colorful background */}
      <div className="page-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
      <div className="blob blob-5" />

      {/* ── Navbar ── */}
      <nav className="glass-nav" style={{ position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1180, margin:"0 auto", padding:"13px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:38, height:38, objectFit:"contain", borderRadius:10, background:"#fff", padding:3, boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }} />
            <div>
              <div style={{ fontWeight:800, fontSize:14.5, color:"#1e293b", letterSpacing:"-0.3px", lineHeight:1.2 }}>{SCHOOL.name}</div>
              <div style={{ fontSize:9.5, color:"#94a3b8", lineHeight:1 }}>{SCHOOL.tagline}</div>
            </div>
          </div>
          <div className="nav-links" style={{ display:"flex", alignItems:"center", gap:28 }}>
            <a href="#about"    className="nav-link">About</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#contact"  className="nav-link">Contact</a>
          </div>
          <Link href="/login" className="btn-nav">Sign In →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position:"relative", zIndex:1, padding:"72px 24px 64px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
        <div className={`glass-hero ${visible ? "fade-up" : ""}`} style={{ maxWidth:780, width:"100%", padding:"56px 52px 52px", position:"relative", overflow:"hidden" }}>
          {/* Top shine line */}
          <div style={{ position:"absolute", top:0, left:"8%", right:"8%", height:2, background:"linear-gradient(90deg,transparent,rgba(255,255,255,1),transparent)", borderRadius:2 }} />

          {/* Decorative circles inside card */}
          <div className="deco-shape" style={{ width:180, height:180, background:"rgba(96,165,250,0.15)", top:-50, right:-50 }} />
          <div className="deco-shape" style={{ width:120, height:120, background:"rgba(167,139,250,0.15)", bottom:-30, left:-30 }} />

          {/* Logo */}
          <div className={`logo-float ${visible ? "fade-up" : ""}`} style={{ display:"inline-block", marginBottom:28, position:"relative" }}>
            <div style={{ background:"#fff", borderRadius:22, padding:14, boxShadow:"0 8px 40px rgba(37,99,235,0.2), 0 2px 0 rgba(255,255,255,1)", display:"inline-flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:80, height:80, objectFit:"contain", display:"block" }} />
            </div>
          </div>

          {/* School badge */}
          <div className={visible ? "fade-up d1" : ""} style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <span className="section-badge">🏫 School Management System</span>
          </div>

          <h1 className={`grad-text ${visible ? "fade-up d1" : ""}`} style={{ fontSize:"clamp(34px,5.5vw,60px)", fontWeight:900, letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:10 }}>
            {SCHOOL.name}
          </h1>

          <p className={visible ? "fade-up d1" : ""} style={{ fontSize:14.5, color:"#64748b", fontStyle:"italic", marginBottom:8 }}>
            Excellence in Early Childhood Education
          </p>

          <p className={visible ? "fade-up d2" : ""} style={{ fontSize:17, color:"#475569", marginBottom:10, fontWeight:600, letterSpacing:0.3 }}>
            {SCHOOL.tagline}
          </p>

          <p className={visible ? "fade-up d2" : ""} style={{ fontSize:14.5, color:"#64748b", maxWidth:480, margin:"0 auto 36px", lineHeight:1.85 }}>
            {SCHOOL.mission}
          </p>

          <div className={`hero-btns ${visible ? "fade-up d3" : ""}`} style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:36 }}>
            <Link href="/login" className="btn-primary">Access Portal →</Link>
            <a href="#about" className="btn-outline">Learn More</a>
          </div>

          {/* Role pills */}
          <div className={visible ? "fade-up d4" : ""} style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {["Proprietor", "Principal", "Admin", "Teacher", "Parent", "Student"].map((role, i) => (
              <span key={role} className={`role-pill ${visible ? "fade-up" : ""}`} style={{ animationDelay:`${0.55+i*0.08}s` }}>
                {role}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ position:"relative", zIndex:1, padding:"0 24px 56px" }}>
        <div className={`stats-grid ${visible ? "fade-up d5" : ""}`} style={{ maxWidth:860, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {stats.map(s => (
            <div key={s.label} className="glass-card" style={{ padding:"24px 16px", textAlign:"center" }}>
              <div style={{ fontSize:36, fontWeight:900, color:s.color, lineHeight:1, marginBottom:6 }}>{s.value}</div>
              <div style={{ fontSize:12.5, color:"#64748b", fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ position:"relative", zIndex:1, padding:"56px 24px 64px" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <div className="about-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28, alignItems:"start" }}>
            <div className="glass" style={{ padding:"40px 36px" }}>
              <div className="section-badge">📖 About Us</div>
              <h2 style={{ fontSize:"clamp(24px,3.2vw,34px)", fontWeight:800, letterSpacing:"-0.6px", marginBottom:18, lineHeight:1.25, color:"#1e293b" }}>
                Building Leaders of<br />Tomorrow, Today
              </h2>
              <p style={{ color:"#475569", fontSize:14.5, lineHeight:1.9, marginBottom:18 }}>{SCHOOL.mission}</p>
              <p style={{ color:"#64748b", fontSize:13.5, lineHeight:1.9 }}>
                Located in the heart of Mpape, Abuja, Hope Hills Academy provides a nurturing environment where children from crèche through primary school develop academically, socially, and emotionally.
              </p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { icon:"🎯", title:"Our Vision",   color:"#6366f1", text:"To raise a generation of well-rounded, confident, and excellent leaders through quality early childhood education." },
                { icon:"📚", title:"Our Approach", color:"#059669", text:"A blend of modern teaching methods with strong moral foundations, creating a holistic learning experience for every child." },
                { icon:"🏆", title:"Our Strength", color:"#d97706", text:"Dedicated teachers, modern facilities, and a caring community that places every child's success at the centre." },
              ].map(item => (
                <div key={item.title} className="glass-card" style={{ padding:"18px 20px", display:"flex", gap:16, alignItems:"flex-start" }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${item.color}15`, border:`1.5px solid ${item.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:21, flexShrink:0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:5, color:"#1e293b" }}>{item.title}</div>
                    <div style={{ color:"#64748b", fontSize:13, lineHeight:1.75 }}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ position:"relative", zIndex:1, padding:"56px 24px 72px" }}>
        <div style={{ maxWidth:1120, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <div className="section-badge">⚙️ Management Portal</div>
            <h2 style={{ fontSize:"clamp(26px,3.8vw,40px)", fontWeight:800, letterSpacing:"-0.7px", marginBottom:10, color:"#1e293b" }}>
              Everything {SCHOOL.name} needs
            </h2>
            <p style={{ color:"#64748b", fontSize:15 }}>One dashboard. All the tools.</p>
          </div>

          <div className="feat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
            {features.map(f => (
              <div key={f.title} className="glass-card" style={{ padding:"28px 24px" }}>
                <div style={{ width:52, height:52, borderRadius:14, background:f.bg, border:`1.5px solid ${f.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize:16, fontWeight:700, marginBottom:9, color:"#1e293b" }}>{f.title}</h3>
                <p style={{ color:"#64748b", fontSize:13.5, lineHeight:1.75, margin:0 }}>{f.desc}</p>
                <div style={{ marginTop:18, height:3, borderRadius:3, background:`linear-gradient(90deg,${f.color},${f.color}00)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ position:"relative", zIndex:1, padding:"56px 24px 72px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div className="section-badge">📬 Get in Touch</div>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,36px)", fontWeight:800, letterSpacing:"-0.6px", marginBottom:10, color:"#1e293b" }}>Contact Us</h2>
            <p style={{ color:"#64748b", fontSize:14.5 }}>We&apos;d love to hear from you. Reach out anytime.</p>
          </div>

          <div className="contact-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
            {[
              {
                icon:"📍", title:"Address", color:"#d97706", bg:"#fffbeb",
                body: <p style={{ color:"#64748b", fontSize:13.5, lineHeight:1.85 }}>Plot A/MF/5, Mpape 2 Layout<br />Opposite Zenith Bank, Mpape<br />901101, Federal Capital Territory</p>,
              },
              {
                icon:"📞", title:"Phone", color:"#059669", bg:"#ecfdf5",
                body: <div style={{ display:"flex", flexDirection:"column", gap:7 }}>{SCHOOL.phones.map(p => <a key={p} href={`tel:${p}`} style={{ color:"#059669", fontSize:15, fontWeight:700, textDecoration:"none" }}>{p}</a>)}</div>,
              },
              {
                icon:"✉️", title:"Email", color:"#2563eb", bg:"#eff6ff",
                body: <div style={{ display:"flex", flexDirection:"column", gap:7 }}>{SCHOOL.emails.map(e => <a key={e} href={`mailto:${e}`} style={{ color:"#2563eb", fontSize:13, fontWeight:500, textDecoration:"none", wordBreak:"break-all" }}>{e}</a>)}</div>,
              },
            ].map(({ icon, title, color, bg, body }) => (
              <div key={title} className="glass-card" style={{ padding:"28px 24px" }}>
                <div style={{ width:50, height:50, borderRadius:14, background:bg, border:`1.5px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:16 }}>
                  {icon}
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:12, color:"#1e293b" }}>{title}</div>
                {body}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ position:"relative", zIndex:1, padding:"0 24px 80px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div className="glass-hero" style={{ padding:"64px 48px", textAlign:"center", position:"relative", overflow:"hidden", background:"rgba(255,255,255,0.68)" }}>
            <div style={{ position:"absolute", top:-80, right:-80, width:240, height:240, borderRadius:"50%", background:"rgba(96,165,250,0.2)", filter:"blur(40px)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:-60, left:-60, width:200, height:200, borderRadius:"50%", background:"rgba(167,139,250,0.2)", filter:"blur(36px)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:2, background:"linear-gradient(90deg,transparent,rgba(255,255,255,1),transparent)" }} />

            <div style={{ position:"relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:64, height:64, objectFit:"contain", background:"#fff", borderRadius:18, padding:7, marginBottom:20, boxShadow:"0 8px 32px rgba(37,99,235,0.2)" }} />
              <h2 style={{ fontSize:"clamp(22px,3.8vw,36px)", fontWeight:800, marginBottom:12, letterSpacing:"-0.5px", color:"#1e293b" }}>
                Ready to get started?
              </h2>
              <p style={{ color:"#64748b", marginBottom:32, fontSize:15.5, maxWidth:420, margin:"0 auto 32px", lineHeight:1.75 }}>
                Sign in to access the {SCHOOL.name} management portal.
              </p>
              <Link href="/login" className="btn-primary">
                Sign In to Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position:"relative", zIndex:1, borderTop:"1.5px solid rgba(255,255,255,0.7)", background:"rgba(255,255,255,0.55)", backdropFilter:"blur(20px)" }}>
        <div className="footer-cols" style={{ maxWidth:1060, margin:"0 auto", padding:"40px 32px 24px", display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", gap:32 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:32, height:32, objectFit:"contain", background:"#fff", borderRadius:8, padding:2, boxShadow:"0 2px 6px rgba(0,0,0,0.08)" }} />
              <span style={{ fontWeight:700, fontSize:13.5, color:"#1e293b" }}>{SCHOOL.name}</span>
            </div>
            <p style={{ color:"#64748b", fontSize:12.5, lineHeight:1.85, maxWidth:260 }}>
              {SCHOOL.tagline}<br />Excellence in Early Childhood Education
            </p>
          </div>
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1.5, marginBottom:14 }}>Contact</div>
            {SCHOOL.phones.map(p => <a key={p} href={`tel:${p}`} style={{ display:"block", color:"#475569", fontSize:13, textDecoration:"none", marginBottom:6 }}>{p}</a>)}
            {SCHOOL.emails.map(e => <a key={e} href={`mailto:${e}`} style={{ display:"block", color:"#64748b", fontSize:12, textDecoration:"none", marginBottom:5, wordBreak:"break-all" }}>{e}</a>)}
          </div>
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1.5, marginBottom:14 }}>Address</div>
            <span style={{ color:"#64748b", fontSize:12.5, lineHeight:1.85 }}>
              Plot A/MF/5, Mpape 2 Layout<br />
              Opposite Zenith Bank, Mpape<br />
              901101, FCT, Nigeria
            </span>
          </div>
        </div>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"14px 32px 20px", borderTop:"1px solid rgba(148,163,184,0.2)", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <span style={{ color:"#94a3b8", fontSize:12 }}>© {new Date().getFullYear()} {SCHOOL.name}. All rights reserved.</span>
          <span style={{ color:"#94a3b8", fontSize:11 }}>School Management System</span>
        </div>
      </footer>
    </div>
  );
}
