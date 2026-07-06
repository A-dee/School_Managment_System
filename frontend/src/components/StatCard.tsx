interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode | string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "cyan";
  subtitle?: string;
  trend?: { value: number; label?: string };
}

const colorMap: Record<string, { bg: string; glow: string; text: string; border: string; bar: string }> = {
  blue:   { bg: "rgba(79,70,229,0.12)",  glow: "rgba(79,70,229,0.2)",  text: "#6366f1", border: "rgba(79,70,229,0.22)",  bar: "#6366f1" },
  green:  { bg: "rgba(16,185,129,0.12)", glow: "rgba(16,185,129,0.2)", text: "#10b981", border: "rgba(16,185,129,0.22)", bar: "#10b981" },
  yellow: { bg: "rgba(245,158,11,0.12)", glow: "rgba(245,158,11,0.2)", text: "#f59e0b", border: "rgba(245,158,11,0.22)", bar: "#f59e0b" },
  red:    { bg: "rgba(239,68,68,0.12)",  glow: "rgba(239,68,68,0.2)",  text: "#ef4444", border: "rgba(239,68,68,0.22)",  bar: "#ef4444" },
  purple: { bg: "rgba(168,85,247,0.12)", glow: "rgba(168,85,247,0.2)", text: "#a855f7", border: "rgba(168,85,247,0.22)", bar: "#a855f7" },
  cyan:   { bg: "rgba(6,182,212,0.12)",  glow: "rgba(6,182,212,0.2)",  text: "#06b6d4", border: "rgba(6,182,212,0.22)",  bar: "#06b6d4" },
};

export default function StatCard({ title, value, icon, color = "blue", subtitle, trend }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      className="t-card animate-fade-in"
      style={{
        cursor: "default",
        transition: "transform 0.2s, box-shadow 0.25s, border-color 0.2s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `var(--shadow-md), 0 0 0 1px ${c.border}, 0 8px 24px ${c.glow}`;
        el.style.borderColor = c.border;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "var(--shadow-sm)";
        el.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
          }}>
            {title}
          </p>
          <p style={{
            fontSize: "1.6rem", fontWeight: 750, color: "var(--text-primary)",
            lineHeight: 1, letterSpacing: "-0.02em",
          }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: 5 }}>{subtitle}</p>
          )}
          {trend && (
            <p style={{
              fontSize: "0.72rem", marginTop: 5, fontWeight: 600,
              color: trend.value >= 0 ? "#10b981" : "#ef4444",
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <span style={{ fontSize: "0.65rem" }}>{trend.value >= 0 ? "▲" : "▼"}</span>
              {Math.abs(trend.value)}% {trend.label || "vs last term"}
            </p>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${c.bg} 0%, color-mix(in srgb, ${c.bg} 60%, transparent) 100%)`,
          color: c.text,
          border: `1px solid ${c.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem",
          boxShadow: `0 4px 12px ${c.glow}`,
        }}>
          {icon}
        </div>
      </div>

      {/* Gradient bar */}
      <div style={{
        marginTop: 14, height: 3, borderRadius: 999,
        background: `linear-gradient(90deg, ${c.bar} 0%, color-mix(in srgb, ${c.bar} 30%, transparent) 100%)`,
        opacity: 0.55,
      }} />
    </div>
  );
}
