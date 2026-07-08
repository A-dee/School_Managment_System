import React from "react";
import { CalendarDays } from "lucide-react";

export type YNValue = boolean | null;

export const PARENT_MANAGED_LEVEL_KEYWORDS = ["CRECHE", "CRÈCHE", "NURSERY", "PRESCHOOL", "KINDERGARTEN", "PRIMARY", "GRADE", "BASIC"];

export function isParentManagedLevel(level?: string | null) {
  if (!level) return false;
  const upper = level.trim().toUpperCase();
  return PARENT_MANAGED_LEVEL_KEYWORDS.some((keyword) => upper.includes(keyword));
}

export function YesNo({ label, value, onChange }: { label: string; value: YNValue; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {label && <span className="t-text-secondary yn-label" style={{ fontSize: "0.8125rem", minWidth: 120 }}>{label}</span>}
      <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <input type="radio" checked={value === true} onChange={() => onChange(true)} />
        <span style={{ fontSize: "0.8125rem" }}>Yes</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <input type="radio" checked={value === false} onChange={() => onChange(false)} />
        <span style={{ fontSize: "0.8125rem" }}>No</span>
      </label>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: "var(--accent)", flexShrink: 0 }} />
      <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</h3>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  inputId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputId: string;
}) {
  const openPicker = () => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {}
    input.focus();
  };

  return (
    <div>
      <label className="t-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          className="t-input"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 42 }}
        />
        <button
          type="button"
          aria-label={`Pick ${label.toLowerCase()}`}
          onClick={openPicker}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <CalendarDays size={16} />
        </button>
      </div>
    </div>
  );
}
