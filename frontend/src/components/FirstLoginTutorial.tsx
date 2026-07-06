"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Compass, LayoutDashboard, MessageSquare, School, UserCircle, Wallet } from "lucide-react";

type TutorialUser = {
  id?: number;
  email?: string;
  role?: string;
};

type TutorialStep = {
  title: string;
  body: string;
  icon: any;
};

function buildSteps(role: string): TutorialStep[] {
  const common: TutorialStep[] = [
    {
      title: "This is your dashboard",
      body: "Your home page gives you the quickest route to the things you use most often. The cards and shortcuts on this screen are safe places to start.",
      icon: LayoutDashboard,
    },
    {
      title: "Use the sidebar to move around",
      body: "The sidebar holds the main sections for your role. On phone, open it from the menu button at the top left.",
      icon: Compass,
    },
    {
      title: "Check notifications from the bell",
      body: "The bell in the top bar now opens a mini notification panel. You can read alerts there and clear them after viewing.",
      icon: Bell,
    },
    {
      title: "Messages and profile are always nearby",
      body: "Use Messages to contact the school or other users allowed for your role, and keep your profile details up to date from the profile section.",
      icon: UserCircle,
    },
  ];

  const roleSpecific: Record<string, TutorialStep[]> = {
    SUPER_ADMIN: [
      {
        title: "Oversee the whole school",
        body: "You can manage students, staff, classes, announcements, reports, finance, and user accounts from this portal.",
        icon: School,
      },
      {
        title: "Start with announcements or school records",
        body: "A good first step is checking announcements, students, staff, and finance so you can see the current state of the school quickly.",
        icon: Wallet,
      },
    ],
    ADMIN: [
      {
        title: "Focus on school operations",
        body: "Your dashboard is centered on fees, invoices, payments, payroll, announcements, and day-to-day school records.",
        icon: Wallet,
      },
      {
        title: "Finance tools are grouped for you",
        body: "Use the finance shortcuts to review fee structures, track payments, and follow up on invoices without digging through the full menu.",
        icon: School,
      },
    ],
    PRINCIPAL: [
      {
        title: "You can supervise academics and operations",
        body: "Use this dashboard to review students, staff, classes, report cards, and school performance from one place.",
        icon: School,
      },
      {
        title: "Watch the overview cards first",
        body: "The summary cards and quick stats help you spot issues early before moving into detailed student, staff, or finance pages.",
        icon: Wallet,
      },
    ],
    TEACHER: [
      {
        title: "Your quick actions are your main tools",
        body: "Start with My Classes, Subjects, Results, Attendance, and Discipline. Those are the sections you will use most often.",
        icon: School,
      },
      {
        title: "Results and attendance work best from your class flow",
        body: "Pick your class first, then record attendance or upload results so everything stays tied to the correct students.",
        icon: MessageSquare,
      },
    ],
    PARENT: [
      {
        title: "Follow all your children from one account",
        body: "If you have more than one child in school, their records can all appear under this same parent portal.",
        icon: School,
      },
      {
        title: "Use fees, results, and attendance first",
        body: "Those sections help you track payments, academic progress, and daily attendance without needing separate student logins.",
        icon: Wallet,
      },
    ],
    STUDENT: [
      {
        title: "Your essentials are in the quick links",
        body: "Results, fee status, attendance, and messages are the fastest way to check what matters most in your portal.",
        icon: School,
      },
      {
        title: "School updates appear on your dashboard",
        body: "Keep an eye on announcements and notifications so you do not miss result updates, fee reminders, or school notices.",
        icon: Bell,
      },
    ],
  };

  return [...common, ...(roleSpecific[role] || [])];
}

export default function FirstLoginTutorial({ user }: { user: TutorialUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const role = user?.role || "";
  const userId = user?.id;
  const steps = useMemo(() => buildSteps(role), [role]);
  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!userId || !role || !pathname?.endsWith("/dashboard")) return;
    const storageKey = `sms_onboarding_seen_${userId}_${role}`;
    const seen = window.localStorage.getItem(storageKey);
    if (!seen) {
      setOpen(true);
      setStepIndex(0);
    }
  }, [pathname, role, userId]);

  const finish = () => {
    if (userId && role) {
      window.localStorage.setItem(`sms_onboarding_seen_${userId}_${role}`, "1");
    }
    setOpen(false);
  };

  if (!open || !currentStep) return null;

  const Icon = currentStep.icon;
  const isLast = stepIndex === steps.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        width: "min(380px, calc(100vw - 24px))",
        zIndex: 90,
      }}
    >
      <div
        className="t-card animate-scale-in"
        style={{
          padding: "16px 16px 14px",
          borderRadius: 16,
          boxShadow: "0 20px 48px rgba(15,23,42,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>
              First Login Guide
            </div>
            <h3 className="t-text-primary" style={{ fontSize: "0.92rem", fontWeight: 700, lineHeight: 1.35 }}>
              {currentStep.title}
            </h3>
          </div>
        </div>

        <p className="t-text-secondary" style={{ fontSize: "0.8rem", lineHeight: 1.6, marginBottom: 14 }}>
          {currentStep.body}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {steps.map((_, index) => (
              <span
                key={index}
                style={{
                  width: index === stepIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: index === stepIndex ? "var(--accent)" : "color-mix(in srgb, var(--accent) 20%, transparent)",
                  transition: "all 0.18s ease",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={finish}
              style={{
                padding: "8px 10px",
                borderRadius: 9,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              Skip
            </button>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev - 1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) finish();
                else setStepIndex((prev) => prev + 1);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 12px",
                borderRadius: 9,
                border: "none",
                background: "var(--accent)",
                color: "var(--btn-primary-text)",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {isLast ? "Finish" : "Next"} {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
