"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  getClasses,
  getStaff,
  getSubjects,
  getTimetablePeriods,
  getClassTimetable,
  saveTimetableSlot,
  deleteTimetableSlot
} from "@/lib/api";
import toast from "react-hot-toast";
import { Calendar, Plus, Trash2, X, AlertTriangle, Info, User, BookOpen, MapPin } from "lucide-react";

interface Period {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_academic: boolean;
}

interface ClassItem {
  id: number;
  name: string;
}

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Slot {
  id: number;
  day_of_week: string;
  period_id: number;
  class_id: number;
  subject_id: number | null;
  teacher_id: number | null;
  classroom_name: string | null;
  subject?: Subject;
  teacher?: Teacher;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const formatTime = (timeStr: string) => {
  try {
    const parts = timeStr.split(":");
    return `${parts[0]}:${parts[1]}`;
  } catch {
    return timeStr;
  }
};

export default function AdminTimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);

  // Edit Modal State
  const [editingCell, setEditingCell] = useState<{ day: string; period: Period; existingSlot?: Slot } | null>(null);
  const [formSubjectId, setFormSubjectId] = useState<number | "">("");
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formClassroom, setFormClassroom] = useState("");
  const [saving, setSaving] = useState(false);

  // Warning/Conflict Modal State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadGrid(selectedClassId);
    } else {
      setSlots([]);
    }
  }, [selectedClassId]);

  const loadMeta = async () => {
    setLoading(true);
    try {
      const [classRes, periodsRes, staffRes, subjectRes] = await Promise.all([
        getClasses(),
        getTimetablePeriods(),
        getStaff(),
        getSubjects()
      ]);

      const classData = classRes.data.data || [];
      setClasses(classData);
      if (classData.length > 0) {
        setSelectedClassId(classData[0].id);
      }

      // Sort periods by start_time
      const sortedPeriods = (periodsRes.data.data || []).sort(
        (a: Period, b: Period) => a.start_time.localeCompare(b.start_time)
      );
      setPeriods(sortedPeriods);
      setTeachers(staffRes.data.data || []);
      setSubjects(subjectRes.data.data || []);
    } catch {
      toast.error("Failed to load metadata. Please check server connections.");
    } finally {
      setLoading(false);
    }
  };

  const loadGrid = async (classId: number) => {
    setGridLoading(true);
    try {
      const res = await getClassTimetable(classId);
      setSlots(res.data.data || []);
    } catch {
      toast.error("Failed to load timetable slots.");
    } finally {
      setGridLoading(false);
    }
  };

  const handleCellClick = (day: string, period: Period, existingSlot?: Slot) => {
    setEditingCell({ day, period, existingSlot });
    if (existingSlot) {
      setFormSubjectId(existingSlot.subject_id || "");
      setFormTeacherId(existingSlot.teacher_id || "");
      setFormClassroom(existingSlot.classroom_name || "");
    } else {
      setFormSubjectId("");
      setFormTeacherId("");
      setFormClassroom("");
    }
  };

  const handleSaveSlot = async (force = false) => {
    if (!selectedClassId || !editingCell) return;

    const payload = {
      day_of_week: editingCell.day,
      period_id: editingCell.period.id,
      class_id: Number(selectedClassId),
      subject_id: formSubjectId ? Number(formSubjectId) : null,
      teacher_id: formTeacherId ? Number(formTeacherId) : null,
      classroom_name: formClassroom.trim() || null,
      force,
    };

    setSaving(true);
    try {
      const res = await saveTimetableSlot(payload);
      
      // Check for warning status
      if (res.data?.status === "warning" || res.data?.data?.status === "warning") {
        const warningData = res.data?.data || res.data;
        setConflicts(warningData.conflicts || []);
        setPendingPayload(payload);
        setShowWarningModal(true);
        setSaving(false);
        return;
      }

      toast.success("Timetable block saved!");
      setEditingCell(null);
      loadGrid(Number(selectedClassId));
    } catch (err: any) {
      const errorData = err?.response?.data;
      // Handle warning structure inside HTTP exceptions (like 409 Conflict)
      if (errorData?.detail?.status === "warning" || errorData?.status === "warning") {
        setConflicts(errorData?.detail?.conflicts || errorData?.conflicts || []);
        setPendingPayload(payload);
        setShowWarningModal(true);
      } else {
        toast.error(errorData?.detail || "Failed to schedule slot.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForceSave = async () => {
    if (!pendingPayload) return;
    setSaving(true);
    try {
      await saveTimetableSlot({ ...pendingPayload, force: true });
      toast.success("Timetable block saved with conflicts bypassed.");
      setShowWarningModal(false);
      setEditingCell(null);
      loadGrid(Number(selectedClassId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to force save slot.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm("Are you sure you want to remove this timetable block?")) return;
    setSaving(true);
    try {
      await deleteTimetableSlot(slotId);
      toast.success("Schedule block deleted.");
      setEditingCell(null);
      loadGrid(Number(selectedClassId));
    } catch {
      toast.error("Failed to delete timetable slot.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="t-page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 15 }}>
          <div>
            <h1 className="t-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar className="text-accent" size={24} /> Timetable Scheduler
            </h1>
            <p className="t-page-subtitle">Configure weekly period schedules and teachers for classes</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Selected Class:</span>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : "")}
              className="t-input"
              style={{ minWidth: 180, padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem" }}
            >
              <option value="">-- Choose Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}><div className="t-spinner" /></div>
      ) : !selectedClassId ? (
        <div className="t-card" style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: 16, textAlign: "center" }}>
          <Calendar size={48} style={{ color: "var(--accent)", opacity: 0.5, marginBottom: 12 }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Select a Class</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 6, margin: 0 }}>Please choose a class from the top selector to configure its weekly timetable.</p>
        </div>
      ) : (
        <div className="t-card" style={{ padding: 24, borderRadius: 16, overflowX: "auto", position: "relative" }}>
          {gridLoading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.6)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="t-spinner" />
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 8, tableLayout: "fixed", minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ width: 140, padding: "10px 0", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  Period
                </th>
                {DAYS.map(day => (
                  <th key={day} style={{ padding: "10px 0", textAlign: "center", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period.id}>
                  {/* Period Time Row Label */}
                  <td style={{
                    padding: "16px 14px",
                    background: "var(--bg-page)",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    verticalAlign: "middle",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{period.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <ClockIcon size={12} /> {formatTime(period.start_time)} - {formatTime(period.end_time)}
                    </div>
                    {!period.is_academic && (
                      <span style={{
                        display: "inline-block",
                        marginTop: 6,
                        padding: "2px 6px",
                        background: "rgba(245,158,11,0.1)",
                        color: "#d97706",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        borderRadius: 4,
                        textTransform: "uppercase",
                      }}>
                        Non-Academic
                      </span>
                    )}
                  </td>

                  {/* Day Slots */}
                  {DAYS.map(day => {
                    const slot = slots.find(s => s.day_of_week === day && s.period_id === period.id);
                    return (
                      <td
                        key={day}
                        onClick={() => handleCellClick(day, period, slot)}
                        style={{
                          height: 100,
                          padding: 10,
                          background: slot ? "var(--accent-light)" : "var(--bg-page)",
                          border: `1.5px ${slot ? "solid var(--accent)" : "dashed var(--border)"}`,
                          borderRadius: 12,
                          cursor: "pointer",
                          transition: "all 0.15s ease-in-out",
                          verticalAlign: "top",
                        }}
                        className="timetable-cell"
                      >
                        {slot ? (
                          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                                <BookOpen size={13} /> {slot.subject?.code || slot.subject?.name || "Subject"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                <User size={12} /> {slot.teacher ? `${slot.teacher.first_name} ${slot.teacher.last_name}` : "No Teacher"}
                              </div>
                            </div>
                            {slot.classroom_name && (
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                                <MapPin size={11} /> {slot.classroom_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600 }}>
                            <Plus size={14} style={{ marginRight: 4 }} /> Schedule
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid Cell Editor Modal */}
      {editingCell && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-box-md" style={{ padding: 26, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20, justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                  {editingCell.existingSlot ? "Edit Schedule Block" : "Schedule Timetable Block"}
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  {editingCell.day} &middot; {editingCell.period.name} ({formatTime(editingCell.period.start_time)} - {formatTime(editingCell.period.end_time)})
                </p>
              </div>
              <button onClick={() => setEditingCell(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="t-label">Subject</label>
                <select
                  value={formSubjectId}
                  onChange={e => setFormSubjectId(e.target.value ? Number(e.target.value) : "")}
                  className="t-input"
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="t-label">Teacher (Staff Member)</label>
                <select
                  value={formTeacherId}
                  onChange={e => setFormTeacherId(e.target.value ? Number(e.target.value) : "")}
                  className="t-input"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="t-label">Classroom / Room Name</label>
                <input
                  type="text"
                  className="t-input"
                  placeholder="e.g. Science Lab, Room 102"
                  value={formClassroom}
                  onChange={e => setFormClassroom(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {editingCell.existingSlot ? (
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(editingCell.existingSlot!.id)}
                  disabled={saving}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 size={14} /> Remove Block
                </button>
              ) : (
                <div />
              )}
              
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="t-btn-secondary" onClick={() => setEditingCell(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="t-btn-primary"
                  onClick={() => handleSaveSlot(false)}
                  disabled={saving || !formSubjectId || !formTeacherId}
                  style={{ padding: "10px 18px" }}
                >
                  {saving ? "Saving..." : "Save Block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-box-md" style={{ padding: 26, background: "var(--bg-card)", border: "2px solid #f59e0b", borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={24} style={{ color: "#d97706" }} />
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#d97706", margin: 0 }}>
                Schedule Conflict Warnings
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", padding: 16, borderRadius: 10, marginBottom: 20 }}>
              {conflicts.map((c, i) => (
                <div key={i} style={{ fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: 3, color: "#d97706" }} />
                  <span>{c}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: 24, fontWeight: 500 }}>
              Do you want to save this schedule block anyway?
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="t-btn-secondary"
                onClick={() => { setShowWarningModal(false); setPendingPayload(null); }}
              >
                No, Go Back
              </button>
              <button
                type="button"
                className="t-btn-primary"
                onClick={handleForceSave}
                disabled={saving}
                style={{ background: "#d97706", borderColor: "#d97706", color: "#fff" }}
              >
                {saving ? "Saving..." : "Yes, Save Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// Simple clock icon replacement
function ClockIcon({ size = 16, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
