"use client";
import { useEffect, useState } from "react";
import { getInstallments, saveInstallments, deleteInstallments } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Plus, Trash2, Save, AlertCircle, Calendar } from "lucide-react";

interface Milestone {
  id?: number;
  name: string;
  amount: number;
  due_date: string;
  status?: string;
  paid_amount?: number;
}

interface TuitionPlannerModalProps {
  invoice: {
    id: number;
    total_fee: number | string;
    balance: number | string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function TuitionPlannerModal({ invoice, onClose, onSuccess }: TuitionPlannerModalProps) {
  const totalFee = Number(invoice.total_fee);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [planOption, setPlanOption] = useState<"50_50" | "50_25_25" | "custom">("50_50");
  const [hasExistingPlan, setHasExistingPlan] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [invoice.id]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await getInstallments(invoice.id);
      const data = res.data.data;
      if (data && data.milestones && data.milestones.length > 0) {
        // Map milestone details
        const mapped = data.milestones.map((m: any) => ({
          id: m.id,
          name: m.name,
          amount: Number(m.amount),
          due_date: m.due_date,
          status: m.status,
          paid_amount: Number(m.paid_amount || 0),
        }));
        setMilestones(mapped);
        setHasExistingPlan(true);

        // Try to identify split type
        if (mapped.length === 2 && mapped[0].amount === totalFee * 0.5 && mapped[1].amount === totalFee * 0.5) {
          setPlanOption("50_50");
        } else if (
          mapped.length === 3 &&
          mapped[0].amount === totalFee * 0.5 &&
          Math.abs(mapped[1].amount - totalFee * 0.25) < 1 &&
          Math.abs(mapped[2].amount - totalFee * 0.25) < 1
        ) {
          setPlanOption("50_25_25");
        } else {
          setPlanOption("custom");
        }
      } else {
        applyPreset("50_50");
      }
    } catch {
      applyPreset("50_50");
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (option: "50_50" | "50_25_25") => {
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const upperMonth = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (option === "50_50") {
      setMilestones([
        { name: "First Installment", amount: Number((totalFee * 0.5).toFixed(2)), due_date: today },
        { name: "Second Installment", amount: Number((totalFee * 0.5).toFixed(2)), due_date: nextMonth },
      ]);
    } else if (option === "50_25_25") {
      setMilestones([
        { name: "First Installment", amount: Number((totalFee * 0.5).toFixed(2)), due_date: today },
        { name: "Second Installment", amount: Number((totalFee * 0.25).toFixed(2)), due_date: nextMonth },
        { name: "Third Installment", amount: Number((totalFee * 0.25).toFixed(2)), due_date: upperMonth },
      ]);
    }
  };

  const handleOptionChange = (option: "50_50" | "50_25_25" | "custom") => {
    setPlanOption(option);
    if (option !== "custom") {
      applyPreset(option);
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const next = [...milestones];
    next[index] = { ...next[index], [field]: value };
    setMilestones(next);
  };

  const addMilestone = () => {
    const nextMonth = new Date(Date.now() + 30 * milestones.length * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setMilestones([
      ...milestones,
      { name: `Milestone ${milestones.length + 1}`, amount: 0, due_date: nextMonth },
    ]);
  };

  const removeMilestone = (index: number) => {
    const next = milestones.filter((_, i) => i !== index);
    setMilestones(next);
  };

  const sumMilestones = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
  const isValidSum = Math.abs(sumMilestones - totalFee) < 0.1;

  const handleSave = async () => {
    if (milestones.length === 0) {
      toast.error("Add at least one milestone");
      return;
    }

    if (!isValidSum) {
      toast.error(`The sum of milestones (₦${sumMilestones.toLocaleString()}) must equal the total invoice fee (₦${totalFee.toLocaleString()})`);
      return;
    }

    // Check dates and names
    for (const m of milestones) {
      if (!m.name.trim()) {
        toast.error("All milestones must have names");
        return;
      }
      if (!m.due_date) {
        toast.error(`Please select a due date for ${m.name}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = milestones.map(m => ({
        name: m.name,
        amount: m.amount,
        due_date: m.due_date,
      }));
      await saveInstallments(invoice.id, payload);
      toast.success("Installment plan saved successfully!");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to configure installment plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!confirm("Are you sure you want to remove the installment plan? This will revert the invoice to single-payment mode.")) {
      return;
    }
    setSaving(true);
    try {
      await deleteInstallments(invoice.id);
      toast.success("Installment plan removed");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to delete plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-box-md" style={{ padding: 28, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>Configure Installment Plan</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
              Invoice #{invoice.id} &middot; Total Tuition: ₦{totalFee.toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div className="t-spinner" />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Split options */}
            <div>
              <label className="t-label">Choose Split Option</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => handleOptionChange("50_50")}
                  className={planOption === "50_50" ? "t-btn-primary" : "t-btn-secondary"}
                  style={{ fontSize: "0.78rem" }}
                >
                  50% / 50% (Two Splits)
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionChange("50_25_25")}
                  className={planOption === "50_25_25" ? "t-btn-primary" : "t-btn-secondary"}
                  style={{ fontSize: "0.78rem" }}
                >
                  50% / 25% / 25% (Three Splits)
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionChange("custom")}
                  className={planOption === "custom" ? "t-btn-primary" : "t-btn-secondary"}
                  style={{ fontSize: "0.78rem" }}
                >
                  Custom Splits
                </button>
              </div>
            </div>

            {/* Milestones list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-page)" }}>
                  <div style={{ flex: 2 }}>
                    <label className="t-label" style={{ fontSize: "0.7rem", marginBottom: 3 }}>Milestone Name</label>
                    <input
                      type="text"
                      className="t-input"
                      value={m.name}
                      onChange={e => updateMilestone(i, "name", e.target.value)}
                      disabled={planOption !== "custom"}
                      placeholder="e.g. First Installment"
                      style={{ padding: "8px 10px" }}
                    />
                  </div>

                  <div style={{ flex: 1.5 }}>
                    <label className="t-label" style={{ fontSize: "0.7rem", marginBottom: 3 }}>Amount (₦)</label>
                    <input
                      type="number"
                      className="t-input"
                      value={m.amount}
                      onChange={e => updateMilestone(i, "amount", Number(e.target.value))}
                      disabled={planOption !== "custom"}
                      placeholder="Amount"
                      style={{ padding: "8px 10px" }}
                    />
                  </div>

                  <div style={{ flex: 2 }}>
                    <label className="t-label" style={{ fontSize: "0.7rem", marginBottom: 3 }}>Due Date</label>
                    <input
                      type="date"
                      className="t-input"
                      value={m.due_date}
                      onChange={e => updateMilestone(i, "due_date", e.target.value)}
                      style={{ padding: "8px 10px" }}
                    />
                  </div>

                  {planOption === "custom" && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "none", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {planOption === "custom" && (
              <button
                type="button"
                onClick={addMilestone}
                className="t-btn-secondary"
                style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Plus size={14} /> Add Milestone Split
              </button>
            )}

            {/* Sum check banner */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: 10,
              background: isValidSum ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
              border: `1px solid ${isValidSum ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
              color: isValidSum ? "#10b981" : "#d97706",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} />
                <span>Sum: ₦{sumMilestones.toLocaleString()} / ₦{totalFee.toLocaleString()}</span>
              </div>
              <span>{isValidSum ? "Valid Plan" : "Sum must match total"}</span>
            </div>

            {/* Modal actions */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {hasExistingPlan ? (
                <button
                  type="button"
                  onClick={handleDeletePlan}
                  disabled={saving}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove Plan
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="t-btn-secondary" onClick={onClose} style={{ fontSize: "0.8rem" }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="t-btn-primary"
                  onClick={handleSave}
                  disabled={saving || !isValidSum}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}
                >
                  <Save size={14} /> {saving ? "Saving..." : "Save Plan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
