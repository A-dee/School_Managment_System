"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getDashboardPath } from "@/lib/auth";
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
  { icon: "👨‍🎓", title: "Student Management",   desc: "Enroll students, track progress, manage academic records, and issue report cards from one place." },
  { icon: "👩‍🏫", title: "Staff & Teachers",      desc: "Manage staff profiles, class assignments, attendance, and payroll efficiently." },
  { icon: "💰",   title: "Finance & School Fees", desc: "Generate invoices, record payments, track expenses, and manage scholarship exemptions." },
  { icon: "📊",   title: "Results & Report Cards", desc: "Enter results and print branded A4 report cards with school letterhead." },
  { icon: "💬",   title: "Messaging",             desc: "Communicate directly between staff, parents, and management in real time." },
  { icon: "🏫",   title: "Parent & Student Portal", desc: "Parents and students get dedicated portals to stay connected to the school." },
];

const stats = [
  { value: "360°", label: "School Coverage" },
  { value: "6",    label: "User Roles" },
  { value: "∞",    label: "Students Supported" },
  { value: "24/7", label: "Always Available" },
];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted]   = useState(false);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    const role = getRole();
    if (role) { router.replace(getDashboardPath(role)); return; }
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [router]);

  if (!mounted) return null;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#fff" }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        .fade-up  { animation:fadeUp 0.7s ease both; }
        .delay-1  { animation-delay:0.1s; }
        .delay-2  { animation-delay:0.22s; }
        .delay-3  { animation-delay:0.36s; }
        .delay-4  { animation-delay:0.52s; }
        .feature-card {
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:16px; padding:28px 24px;
          transition:transform 0.25s ease, background 0.25s, border-color 0.25s;
        }
        .feature-card:hover { transform:translateY(-6px); background:rgba(37,99,235,0.15); border-color:rgba(37,99,235,0.45); }
        .cta-btn {
          display:inline-block; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff;
          font-size:17px; font-weight:700; padding:16px 40px; border-radius:50px;
          text-decoration:none; transition:transform 0.2s, box-shadow 0.2s;
          box-shadow:0 4px 24px rgba(37,99,235,0.45);
        }
        .cta-btn:hover { transform:scale(1.05) translateY(-2px); box-shadow:0 8px 40px rgba(37,99,235,0.6); }
        .stat-card {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:12px; padding:24px 16px; text-align:center; transition:background 0.2s;
        }
        .stat-card:hover { background:rgba(37,99,235,0.12); }
        .shimmer-text {
          background:linear-gradient(90deg,#93c5fd 0%,#fff 40%,#93c5fd 60%,#fff 100%);
          background-size:200% auto; -webkit-background-clip:text;
          -webkit-text-fill-color:transparent; background-clip:text;
          animation:shimmer 3.5s linear infinite;
        }
        .pulse-icon { animation:float 3s ease-in-out infinite; display:inline-block; }
        .nav-link { color:rgba(255,255,255,0.7); text-decoration:none; font-size:14px; transition:color 0.2s; }
        .nav-link:hover { color:#fff; }
        .contact-card {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:14px; padding:24px 20px; transition:background 0.2s;
        }
        .contact-card:hover { background:rgba(37,99,235,0.1); }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 40px", borderBottom:"1px solid rgba(255,255,255,0.06)", backdropFilter:"blur(8px)", position:"sticky", top:0, zIndex:10, background:"rgba(15,23,42,0.88)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:38, height:38, objectFit:"contain", background:"#fff", borderRadius:8, padding:2 }} />
          <div>
            <div style={{ fontWeight:800, fontSize:15, letterSpacing:"-0.3px", lineHeight:1.2 }}>{SCHOOL.name}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", lineHeight:1 }}>{SCHOOL.tagline}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:28 }}>
          <a href="#about"    className="nav-link">About</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#contact"  className="nav-link">Contact</a>
          <Link href="/login" className="cta-btn" style={{ padding:"10px 24px", fontSize:14 }}>Sign In</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign:"center", padding:"100px 24px 80px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-60%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(37,99,235,0.18) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div className={visible ? "fade-up" : ""} style={{ marginBottom:24 }}>
          <div className="pulse-icon" style={{ display:"inline-block", background:"#fff", borderRadius:24, padding:10, boxShadow:"0 8px 40px rgba(37,99,235,0.4)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:88, height:88, objectFit:"contain", display:"block" }} />
          </div>
        </div>

        <h1 className={`${visible ? "fade-up delay-1" : ""} shimmer-text`} style={{ fontSize:"clamp(36px,6vw,64px)", fontWeight:900, lineHeight:1.1, marginBottom:12, letterSpacing:"-1.5px" }}>
          {SCHOOL.name}
        </h1>
        <p className={visible ? "fade-up delay-1" : ""} style={{ fontSize:16, color:"rgba(255,255,255,0.5)", marginBottom:16, fontStyle:"italic" }}>
          Excellence in Early Childhood Education
        </p>
        <p className={visible ? "fade-up delay-2" : ""} style={{ fontSize:17, color:"rgba(255,255,255,0.6)", maxWidth:560, margin:"0 auto 16px", lineHeight:1.7 }}>
          {SCHOOL.tagline}
        </p>
        <p className={visible ? "fade-up delay-2" : ""} style={{ fontSize:15, color:"rgba(255,255,255,0.45)", maxWidth:540, margin:"0 auto 44px", lineHeight:1.8 }}>
          {SCHOOL.mission}
        </p>

        <div className={visible ? "fade-up delay-3" : ""} style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/login" className="cta-btn">Access Portal →</Link>
          <a href="#about" style={{ display:"inline-block", color:"rgba(255,255,255,0.7)", fontSize:16, fontWeight:600, padding:"16px 32px", borderRadius:50, border:"1px solid rgba(255,255,255,0.15)", textDecoration:"none", transition:"border-color 0.2s,color 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.color="#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.7)"; }}>
            Learn More
          </a>
        </div>

        <div className={visible ? "fade-up delay-4" : ""} style={{ marginTop:56, display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          {["Proprietor", "Principal", "Admin", "Teacher", "Parent", "Student"].map((role, i) => (
            <span key={role} style={{ background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.3)", borderRadius:50, padding:"6px 16px", fontSize:13, color:"#93c5fd", fontWeight:500, animationDelay:`${0.55+i*0.07}s` }}
              className={visible ? "fade-up" : ""}>
              {role}
            </span>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" style={{ padding:"60px 40px", maxWidth:900, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16 }}>
          {stats.map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize:36, fontWeight:800, color:"#60a5fa", marginBottom:6 }}>{s.value}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" style={{ padding:"60px 40px 80px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#60a5fa", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>About Us</div>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-0.8px", marginBottom:20, lineHeight:1.2 }}>
              Building Leaders of<br />Tomorrow, Today
            </h2>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:15, lineHeight:1.8, marginBottom:20 }}>
              {SCHOOL.mission}
            </p>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14, lineHeight:1.8 }}>
              Located in the heart of Mpape, Abuja, Hope Hills Academy provides a nurturing environment
              where children from crèche through primary school develop academically, socially, and emotionally.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              { icon:"🎯", title:"Our Vision",   text:"To raise a generation of well-rounded, confident, and excellent leaders through quality early childhood education." },
              { icon:"📚", title:"Our Approach", text:"A blend of modern teaching methods with strong moral foundations, creating a holistic learning experience for every child." },
              { icon:"🏆", title:"Our Strength", text:"Dedicated teachers, modern facilities, and a caring community that places every child's success at the centre of all we do." },
            ].map(item => (
              <div key={item.title} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"16px 18px", display:"flex", gap:14, alignItems:"flex-start" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{item.title}</div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:13, lineHeight:1.65 }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding:"60px 40px 80px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#60a5fa", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Management Portal</div>
          <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-0.8px", marginBottom:12 }}>
            Everything {SCHOOL.name} needs
          </h2>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:16 }}>One dashboard. All the tools.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20 }}>
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize:36, marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{f.title}</h3>
              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:14, lineHeight:1.65, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ padding:"60px 40px 80px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#60a5fa", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Get in Touch</div>
          <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-0.8px", marginBottom:12 }}>Contact Us</h2>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:15 }}>We&apos;d love to hear from you. Reach out to us anytime.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:20 }}>
          <div className="contact-card">
            <div style={{ fontSize:28, marginBottom:12 }}>📍</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Address</div>
            <div style={{ color:"rgba(255,255,255,0.55)", fontSize:14, lineHeight:1.7 }}>
              Plot A/MF/5, Mpape 2 Layout<br />
              Opposite Zenith Bank, Mpape<br />
              901101, Federal Capital Territory
            </div>
          </div>
          <div className="contact-card">
            <div style={{ fontSize:28, marginBottom:12 }}>📞</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Phone</div>
            {SCHOOL.phones.map(p => (
              <a key={p} href={`tel:${p}`} style={{ display:"block", color:"#60a5fa", fontSize:15, fontWeight:600, textDecoration:"none", marginBottom:6 }}>
                {p}
              </a>
            ))}
          </div>
          <div className="contact-card">
            <div style={{ fontSize:28, marginBottom:12 }}>✉️</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Email</div>
            {SCHOOL.emails.map(e => (
              <a key={e} href={`mailto:${e}`} style={{ display:"block", color:"#60a5fa", fontSize:13, fontWeight:500, textDecoration:"none", marginBottom:6, wordBreak:"break-all" }}>
                {e}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ margin:"0 40px 80px", borderRadius:24, background:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)", padding:"60px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:64, height:64, objectFit:"contain", background:"#fff", borderRadius:16, padding:6, marginBottom:18, boxShadow:"0 4px 24px rgba(0,0,0,0.25)" }} />
          <h2 style={{ fontSize:"clamp(24px,4vw,38px)", fontWeight:800, marginBottom:12, letterSpacing:"-0.5px" }}>
            Ready to get started?
          </h2>
          <p style={{ color:"rgba(255,255,255,0.75)", marginBottom:32, fontSize:16 }}>
            Sign in to access the {SCHOOL.name} management portal.
          </p>
          <Link href="/login" className="cta-btn" style={{ background:"#fff", color:"#1e3a8a" }}>
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"32px 40px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:24, marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hope-hills-logo.png" alt={SCHOOL.name} style={{ width:32, height:32, objectFit:"contain", background:"#fff", borderRadius:6, padding:2 }} />
              <span style={{ fontWeight:700, fontSize:14 }}>{SCHOOL.name}</span>
            </div>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:12, lineHeight:1.7, maxWidth:280 }}>
              {SCHOOL.tagline}<br />
              Excellence in Early Childhood Education
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Contact</span>
            {SCHOOL.phones.map(p => (
              <a key={p} href={`tel:${p}`} style={{ color:"rgba(255,255,255,0.5)", fontSize:13, textDecoration:"none" }}>{p}</a>
            ))}
            {SCHOOL.emails.map(e => (
              <a key={e} href={`mailto:${e}`} style={{ color:"rgba(255,255,255,0.5)", fontSize:12, textDecoration:"none" }}>{e}</a>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Address</span>
            <span style={{ color:"rgba(255,255,255,0.45)", fontSize:12, lineHeight:1.7 }}>
              Plot A/MF/5, Mpape 2 Layout<br />
              Opposite Zenith Bank, Mpape<br />
              901101, FCT, Nigeria
            </span>
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:18, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <span style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>© {new Date().getFullYear()} {SCHOOL.name}. All rights reserved.</span>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:11 }}>School Management System</span>
        </div>
      </footer>
    </div>
  );
}
