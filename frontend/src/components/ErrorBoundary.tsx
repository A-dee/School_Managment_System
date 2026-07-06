"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return this.props.fallback ?? (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "60vh", gap: 12, padding: 24,
      }}>
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
          Something went wrong
        </p>
        <p style={{
          fontSize: "0.8125rem", color: "var(--text-secondary)",
          maxWidth: 400, textAlign: "center",
        }}>
          {this.state.error?.message ?? "An unexpected error occurred."}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: undefined })}
          style={{
            marginTop: 8, padding: "9px 24px", borderRadius: 9,
            background: "var(--accent)", color: "var(--btn-primary-text)",
            border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
