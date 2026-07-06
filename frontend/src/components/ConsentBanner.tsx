"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

const CONSENT_KEY = "sms_consent_v1";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if user hasn't acknowledged yet
    if (!localStorage.getItem(CONSENT_KEY)) {
      // Small delay so it doesn't flash on immediate redirect (logged-in users)
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy and data notice"
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9000,
        width: "min(640px, calc(100vw - 32px))",
        background: "#0f172a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
        padding: "20px 22px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        animation: "consentSlideUp 0.4s cubic-bezier(0.34,1.3,0.64,1)",
      }}
    >
      <style>{`
        @keyframes consentSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(20px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Icon */}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        <ShieldCheck size={20} color="#a5b4fc" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", marginBottom: 6 }}>
          Your Privacy Matters
        </p>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, marginBottom: 14 }}>
          This portal stores session cookies for authentication and processes personal data (students, parents, and staff) to deliver school management services. We do not sell or share your data. By continuing you acknowledge our data practices.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={accept}
            style={{
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
              color: "#fff", fontWeight: 700, fontSize: "0.8125rem",
              padding: "9px 22px", borderRadius: 50, border: "none",
              cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.45)",
            }}
          >
            I Understand — Continue
          </button>
          <Link
            href="/privacy"
            style={{ color: "#a5b4fc", fontSize: "0.8rem", textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 500 }}
          >
            Read Privacy Policy
          </Link>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={accept}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 4, flexShrink: 0, marginTop: 2 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
