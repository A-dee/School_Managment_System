"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { ClipboardList, CreditCard, MessageSquare, UserCheck } from "lucide-react";

export default function StudentDashboard() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api.get("/api/v1/auth/me").then(r => setMe(r.data.data)).catch(() => {});
  }, []);

  const links = [
    { label: "My Results",   icon: ClipboardList, href: "/student/results", desc: "View term results & grades",     color: "#3b82f6" },
    { label: "Fee Status",   icon: CreditCard,    href: "/student/fees",    desc: "Check invoices & payments",     color: "#22c55e" },
    { label: "Messages",     icon: MessageSquare, href: "/messages",        desc: "Contact teachers or admin",     color: "#a855f7" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="t-page-title">
          Hi{me?.email ? `, ${me.email.split("@")[0]}` : ""}! 👋
        </h1>
        <p className="t-page-subtitle">Here's a quick overview of your portal</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {links.map(({ label, icon: Icon, href, desc, color }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className="t-card t-card-hover text-center py-8 cursor-pointer animate-fade-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={30} style={{ color }} />
              </div>
              <h3 className="t-text-primary font-semibold">{label}</h3>
              <p className="t-text-secondary text-sm mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="t-card">
        <p className="t-text-secondary text-sm">
          Need help? Send a message to your teacher or school admin via the <Link href="/messages" style={{ color: "var(--accent)", fontWeight: 600 }}>Messages</Link> section.
        </p>
      </div>
    </DashboardLayout>
  );
}
