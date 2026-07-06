"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/api";
import { getRole } from "@/lib/auth";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2, CalendarDays } from "lucide-react";

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  HOLIDAY:  { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "Holiday" },
  EXAM:     { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "Exam" },
  MEETING:  { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "Meeting" },
  ACTIVITY: { bg: "#d1fae5", text: "#065f46", dot: "#10b981", label: "Activity" },
  OTHER:    { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af", label: "Other" },
};

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CAN_EDIT = new Set(["SUPER_ADMIN", "PRINCIPAL", "ADMIN"]);

type SchoolEvent = {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  event_type: string;
  is_public: boolean;
};

const emptyForm = () => ({
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  event_type: "OTHER",
  is_public: true,
});

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function CalendarPage() {
  const todayRef    = useRef(new Date());
  const today       = todayRef.current;
  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 900;

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents]         = useState<SchoolEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [role, setRole]             = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);  // mobile panel toggle

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [form, setForm]                 = useState(emptyForm());
  const [submitting, setSubmitting]     = useState(false);
  const [deleteId, setDeleteId]         = useState<number | null>(null);

  const canEdit = CAN_EDIT.has(role);

  useEffect(() => { setRole(getRole() || ""); }, []);

  // Load all events for the current year in one go so Upcoming works across months
  const loadEvents = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const r = await getCalendarEvents({ year: y });
      setEvents(r.data.data || []);
    } catch {
      toast.error("Failed to load calendar events");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(year); }, [year, loadEvents]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build grid: leading nulls + day numbers + trailing nulls to complete last row
  const calendarDays = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const eventsOnDay = useCallback((day: number): SchoolEvent[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => {
      const end = e.end_date || e.start_date;
      return e.start_date <= dateStr && dateStr <= end;
    });
  }, [events, year, month]);

  // Upcoming: all events from today onwards in the loaded year
  const upcomingEvents = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0];
    return events
      .filter(e => (e.end_date || e.start_date) >= todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 10);
  }, [events, today]);

  const dayEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const openCreate = () => {
    const pre = selectedDay
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
      : "";
    setEditingEvent(null);
    setForm({ ...emptyForm(), start_date: pre, end_date: pre });
    setModalOpen(true);
  };

  const openEdit = (e: SchoolEvent) => {
    setEditingEvent(e);
    setForm({
      title:       e.title,
      description: e.description || "",
      start_date:  e.start_date,
      end_date:    e.end_date || "",
      event_type:  e.event_type,
      is_public:   e.is_public,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.start_date) {
      toast.error("Title and start date are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        start_date:  form.start_date,
        end_date:    form.end_date || undefined,
        event_type:  form.event_type,
        is_public:   form.is_public,
      };
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, payload);
        toast.success("Event updated");
      } else {
        await createCalendarEvent(payload);
        toast.success("Event created");
      }
      setModalOpen(false);
      await loadEvents(year);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save event");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCalendarEvent(id);
      toast.success("Event deleted");
      setDeleteId(null);
      setSelectedDay(null);
      setShowSidebar(false);
      await loadEvents(year);
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const handleDayClick = (day: number) => {
    const next = selectedDay === day ? null : day;
    setSelectedDay(next);
    if (isMobile && next !== null) setShowSidebar(true);
  };

  // ── Sidebar panel (right column or mobile overlay) ───────────────────────
  const SidePanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Legend */}
      <div className="t-card" style={{ padding: "14px 16px" }}>
        <p className="font-semibold t-text-primary" style={{ fontSize: "0.8125rem", marginBottom: 10 }}>Event Types</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
          {Object.entries(EVENT_COLORS).map(([type, c]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail or upcoming */}
      <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="font-semibold t-text-primary" style={{ fontSize: "0.875rem" }}>
            {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : "Upcoming Events"}
          </p>
          {selectedDay && (
            <button onClick={() => { setSelectedDay(null); setShowSidebar(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 2, lineHeight: 1 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ maxHeight: isMobile ? "none" : 400, overflowY: "auto" }}>
          {(selectedDay ? dayEvents : upcomingEvents).length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <CalendarDays size={28} style={{ color: "var(--text-secondary)", margin: "0 auto 8px" }} />
              <p className="t-text-secondary" style={{ fontSize: "0.8125rem" }}>
                {selectedDay ? "No events on this day." : "No upcoming events this year."}
              </p>
              {canEdit && !selectedDay && (
                <button onClick={openCreate} className="t-btn-primary" style={{ marginTop: 12, fontSize: "0.75rem", padding: "5px 14px" }}>
                  <Plus size={12} style={{ display: "inline", marginRight: 4 }} />
                  Add Event
                </button>
              )}
            </div>
          ) : (
            (selectedDay ? dayEvents : upcomingEvents).map(e => {
              const c = EVENT_COLORS[e.event_type] || EVENT_COLORS.OTHER;
              return (
                <div key={e.id} style={{
                  padding: "11px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ background: c.bg, color: c.text, fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px", borderRadius: 4 }}>
                        {c.label}
                      </span>
                    </div>
                    <p className="font-medium t-text-primary" style={{ fontSize: "0.8125rem", lineHeight: 1.35 }}>{e.title}</p>
                    <p className="t-text-secondary" style={{ fontSize: "0.72rem", marginTop: 2 }}>
                      {e.start_date}{e.end_date && e.end_date !== e.start_date ? ` – ${e.end_date}` : ""}
                    </p>
                    {e.description && (
                      <p className="t-text-secondary" style={{
                        fontSize: "0.72rem", marginTop: 3, lineHeight: 1.4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {e.description}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button onClick={() => openEdit(e)} title="Edit"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, borderRadius: 4 }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(e.id)} title="Delete"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">School Calendar</h1>
          <p className="t-page-subtitle">
            {events.length} event{events.length !== 1 ? "s" : ""} in {year}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isMobile && (
            <button
              onClick={() => setShowSidebar(v => !v)}
              className="t-btn-secondary"
              style={{ fontSize: "0.8125rem", padding: "7px 14px" }}
            >
              {showSidebar ? "Grid" : "Upcoming"}
            </button>
          )}
          {canEdit && (
            <button onClick={openCreate} className="t-btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={15} /> Add Event
            </button>
          )}
        </div>
      </div>

      {/* Layout: side-by-side on desktop, stacked on mobile */}
      {isMobile && showSidebar ? (
        <SidePanel />
      ) : isMobile ? (
        <>
          <CalendarGrid />
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          <CalendarGrid />
          <SidePanel />
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="t-card" style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold t-text-primary" style={{ fontSize: "1rem" }}>
                {editingEvent ? "Edit Event" : "New Event"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="t-btn-secondary" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="t-label">Title *</label>
                <input
                  className="t-input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Mid-Term Exams"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="t-label">Start Date *</label>
                  <input className="t-input" type="date" value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="t-label">End Date</label>
                  <input className="t-input" type="date" value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="t-label">Event Type</label>
                <select className="t-input" value={form.event_type}
                  onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                  {Object.entries(EVENT_COLORS).map(([type, c]) => (
                    <option key={type} value={type}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-label">Description</label>
                <textarea
                  className="t-input"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details..."
                  style={{ resize: "vertical" }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_public}
                  onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} />
                <span className="t-text-secondary" style={{ fontSize: "0.875rem" }}>Visible to all users (students, parents)</span>
              </label>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
              <button onClick={() => setModalOpen(false)} className="t-btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="t-btn-primary">
                {submitting ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="t-card" style={{ width: "100%", maxWidth: 340, padding: 24 }}>
            <h3 className="font-semibold t-text-primary" style={{ marginBottom: 8 }}>Delete this event?</h3>
            <p className="t-text-secondary" style={{ fontSize: "0.875rem", marginBottom: 20 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} className="t-btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteId)}
                className="t-btn-primary" style={{ background: "#ef4444", borderColor: "#ef4444" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );

  // ── Calendar grid sub-component (closure, shares state) ──────────────────
  function CalendarGrid() {
    return (
      <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Month nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid var(--border)",
        }}>
          <button onClick={prevMonth} className="t-btn-secondary" style={{ padding: "5px 10px" }}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-semibold t-text-primary" style={{ fontSize: "1rem" }}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="t-btn-secondary" style={{ padding: "5px 10px" }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {DAYS.map(d => (
            <div key={d} style={{
              padding: "7px 4px", textAlign: "center",
              fontSize: "0.68rem", fontWeight: 600,
              color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {isMobile ? d.charAt(0) : d}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 56 }}>
            <div className="t-spinner" />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {calendarDays.map((day, i) => {
              const dayEvts    = day ? eventsOnDay(day) : [];
              const isSelected = day === selectedDay;
              const todayDay   = day ? isToday(day) : false;
              const isWeekend  = i % 7 === 0 || i % 7 === 6;

              return (
                <div
                  key={i}
                  onClick={() => day && handleDayClick(day)}
                  style={{
                    minHeight: isMobile ? 52 : 84,
                    padding: isMobile ? "4px" : "6px 6px 4px",
                    borderRight: (i + 1) % 7 === 0 ? "none" : "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    cursor: day ? "pointer" : "default",
                    background: isSelected
                      ? "var(--accent-light)"
                      : !day
                        ? "rgba(0,0,0,0.015)"
                        : isWeekend
                          ? "rgba(0,0,0,0.01)"
                          : "transparent",
                    transition: "background 0.12s",
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: todayDay ? "var(--accent)" : "transparent",
                        color: todayDay ? "#fff" : isWeekend ? "var(--text-secondary)" : "var(--text-primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.8rem", fontWeight: todayDay ? 700 : 400,
                        marginBottom: 3,
                      }}>
                        {day}
                      </div>

                      {!isMobile ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {dayEvts.slice(0, 2).map(e => {
                            const c = EVENT_COLORS[e.event_type] || EVENT_COLORS.OTHER;
                            return (
                              <div key={e.id} style={{
                                background: c.bg, color: c.text,
                                fontSize: "0.63rem", fontWeight: 600,
                                padding: "1px 5px", borderRadius: 3,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                                {e.title}
                              </div>
                            );
                          })}
                          {dayEvts.length > 2 && (
                            <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", paddingLeft: 2 }}>
                              +{dayEvts.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        // Mobile: show coloured dots only
                        dayEvts.length > 0 && (
                          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                            {dayEvts.slice(0, 3).map(e => {
                              const c = EVENT_COLORS[e.event_type] || EVENT_COLORS.OTHER;
                              return (
                                <div key={e.id} style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
                              );
                            })}
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
