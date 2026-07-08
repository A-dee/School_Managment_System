"use client";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { checkinAttendance } from "@/lib/api";
import toast from "react-hot-toast";
import { QrCode, LogIn, LogOut, CheckCircle2, AlertTriangle, Clock, User } from "lucide-react";

export default function AttendanceCheckinPage() {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [action, setAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep input focused so barcode/QR scanners work automatically
  useEffect(() => {
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, []);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = admissionNumber.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await checkinAttendance(trimmed, action);
      const data = res.data.data;
      
      setLastScan({
        studentName: `${data.student?.first_name} ${data.student?.last_name}`,
        admissionNumber: data.student?.admission_number,
        className: data.student?.class_name || "Unassigned",
        action: action,
        timestamp: new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
      
      toast.success(`${action === "CHECK_IN" ? "Checked In" : "Checked Out"} successfully!`);
      setAdmissionNumber("");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to log gate attendance. Please check admission number.";
      setErrorMsg(msg);
      toast.error(msg);
      // Auto-clear error after 5s
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
      focusInput();
    }
  };

  return (
    <DashboardLayout>
      <div className="t-page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="t-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <QrCode className="text-accent" size={24} /> Gate Attendance Scanner
          </h1>
          <p className="t-page-subtitle">Scan student ID barcodes or QR codes at the gate</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr md(1.2fr)", gap: 20, maxWidth: 1000 }}>
        {/* Left Column: Scanner Panel */}
        <div className="t-card" style={{ display: "flex", flexDirection: "column", gap: 20, padding: 30, background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            Gate Action Mode
          </h2>

          {/* Check-In / Check-Out Toggle */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setAction("CHECK_IN"); focusInput(); }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "16px",
                borderRadius: 12,
                border: "2px solid " + (action === "CHECK_IN" ? "var(--accent)" : "var(--border)"),
                background: action === "CHECK_IN" ? "var(--accent-light)" : "transparent",
                color: action === "CHECK_IN" ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
            >
              <LogIn size={20} />
              Check-In (Arrival)
            </button>
            <button
              onClick={() => { setAction("CHECK_OUT"); focusInput(); }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "16px",
                borderRadius: 12,
                border: "2px solid " + (action === "CHECK_OUT" ? "#f43f5e" : "var(--border)"),
                background: action === "CHECK_OUT" ? "rgba(244,63,94,0.08)" : "transparent",
                color: action === "CHECK_OUT" ? "#f43f5e" : "var(--text-secondary)",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
            >
              <LogOut size={20} />
              Check-Out (Dismissal)
            </button>
          </div>

          {/* Form / Scanner Trigger */}
          <form onSubmit={handleScanSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="t-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Scan Barcode or Type Admission ID</label>
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                className="t-input"
                placeholder="e.g. HHA/2026/0125"
                value={admissionNumber}
                onChange={e => setAdmissionNumber(e.target.value)}
                disabled={loading}
                style={{
                  fontSize: "1.1rem",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-page)",
                  color: "var(--text-primary)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                  width: "100%",
                }}
              />
              {loading && (
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
                  <div className="t-spinner" style={{ width: 20, height: 20 }} />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !admissionNumber.trim()}
              className="t-btn-primary"
              style={{
                padding: "14px 20px",
                borderRadius: 12,
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              {loading ? "Processing..." : "Submit Scan"}
            </button>
          </form>

          {/* Error Alert Box */}
          {errorMsg && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              animation: "shake 0.3s ease",
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Right Column: Scan Results Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {lastScan ? (
            <div className="t-card animate-fade-in" style={{
              padding: 24,
              borderRadius: 16,
              background: "var(--bg-card)",
              border: "2px solid " + (lastScan.action === "CHECK_IN" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"),
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: lastScan.action === "CHECK_IN" ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                  color: lastScan.action === "CHECK_IN" ? "#10b981" : "#f43f5e",
                }}>
                  {lastScan.action === "CHECK_IN" ? "Gate Entry" : "Gate Exit"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={13} /> {lastScan.timestamp}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                }}>
                  <User size={24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastScan.studentName}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2, margin: 0 }}>
                    Class: <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{lastScan.className}</span>
                  </p>
                  <p style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--text-secondary)", marginTop: 4, margin: 0 }}>
                    ID: {lastScan.admissionNumber}
                  </p>
                </div>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: lastScan.action === "CHECK_IN" ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)",
                color: lastScan.action === "CHECK_IN" ? "#10b981" : "#f43f5e",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}>
                <CheckCircle2 size={16} />
                Attendance check logged successfully.
              </div>
            </div>
          ) : (
            <div className="t-card" style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "60px 20px",
              background: "var(--bg-card)",
              borderRadius: 16,
              border: "1px dashed var(--border)",
              color: "var(--text-secondary)",
              textAlign: "center",
            }}>
              <QrCode size={40} style={{ opacity: 0.5, color: "var(--accent)" }} />
              <div>
                <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Awaiting Scanner Input</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4, margin: 0 }}>Scan barcodes to show verified details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
