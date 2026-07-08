"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { BookOpen, CheckCircle2, Users } from "lucide-react";
import { useTeacherProfile, useCurrentSession, useTeacherClasses, useClassStudents, useClassAttendance } from "@/lib/swr-hooks";

export default function TeacherAttendancePage() {
  const initialDate = new Date().toISOString().split("T")[0];
  const [attendanceDate, setAttendanceDate] = useState(initialDate);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  /* --- SWR Data Hooks --- */
  const { staff, loading: profileLoading } = useTeacherProfile();
  const { currentSession, loading: sessionLoading } = useCurrentSession();
  const { teacherClasses, loading: classesLoading } = useTeacherClasses(staff?.id);

  const assignedClass = useMemo(() => teacherClasses[0] || null, [teacherClasses]);

  const { students, loading: studentsLoading } = useClassStudents(assignedClass?.id);
  const { records: existingRecords, loading: attendanceLoading, refreshAttendance } = useClassAttendance(assignedClass?.id, attendanceDate);

  const loading = profileLoading || sessionLoading || classesLoading || studentsLoading;
  const loadingExisting = attendanceLoading;

  /* Reactively update statuses whenever students list or existing attendance records change */
  useEffect(() => {
    const next: Record<number, string> = {};
    students.forEach((student: any) => {
      next[student.id] = "PRESENT";
    });
    existingRecords.forEach((record: any) => {
      next[record.student_id] = record.status;
    });
    setStatuses(next);
  }, [students, existingRecords]);

  const save = async () => {
    if (!assignedClass || students.length === 0) {
      toast.error("No students found for your class");
      return;
    }
    if (existingRecords.length > 0 && !confirm("Attendance already exists for this date. Save another set of records?")) {
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/v1/attendance/bulk", {
        date: attendanceDate,
        class_id: assignedClass.id,
        records: students.map((student) => ({
          student_id: student.id,
          status: statuses[student.id] || "PRESENT",
        })),
      });
      toast.success("Attendance saved");
      await refreshAttendance();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save attendance");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="t-page-header">
        <div>
          <h1 className="t-page-title">Mark Attendance</h1>
          <p className="t-page-subtitle">
            {assignedClass
              ? `${assignedClass.name}${assignedClass.level ? ` (${assignedClass.level})` : ""}`
            : "Your assigned class attendance list"}
            {currentSession?.name ? ` · ${currentSession.name}` : ""}
            {` · ${new Date(attendanceDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
          </p>
        </div>
        <div>
          <label className="t-label">Attendance Date</label>
          <input
            type="date"
            className="t-input"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            style={{ width: 170 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="t-card" style={{ textAlign: "center", padding: "42px 20px" }}>
          <p className="t-text-secondary text-sm">Loading your class attendance list...</p>
        </div>
      ) : !assignedClass ? (
        <div className="t-card t-empty" style={{ padding: "40px 20px" }}>
          <BookOpen size={38} />
          <p>No class is currently assigned to you.</p>
          <p className="text-xs">Once a class is assigned, its students will appear here automatically.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="t-card t-empty" style={{ padding: "40px 20px" }}>
          <Users size={38} />
          <p>No students found in your class.</p>
          <p className="text-xs">Enroll or assign students to this class to start marking attendance.</p>
        </div>
      ) : (
        <div className="t-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <div>
              <h2 className="font-semibold t-text-primary" style={{ fontSize: "0.95rem" }}>{students.length} Students</h2>
              <p className="t-text-secondary text-sm">
                {loadingExisting
                  ? "Checking saved attendance for this date..."
                  : existingRecords.length > 0
                    ? `${existingRecords.length} saved records found for this date. Current selections are prefilled.`
                    : "Attendance is being recorded for your assigned class only."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="t-btn-secondary text-xs"
                onClick={() => {
                  const next: Record<number, string> = {};
                  students.forEach((student) => { next[student.id] = "PRESENT"; });
                  setStatuses(next);
                }}
              >
                All Present
              </button>
              <button
                className="t-btn-secondary text-xs"
                onClick={() => {
                  const next: Record<number, string> = {};
                  students.forEach((student) => { next[student.id] = "ABSENT"; });
                  setStatuses(next);
                }}
              >
                All Absent
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {students.map((student: any) => (
              <div
                key={student.id}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="t-text-primary text-sm">
                  {student.first_name} {student.last_name}{" "}
                  <span className="t-text-secondary text-xs">({student.admission_number})</span>
                </span>
                <div className="flex gap-2">
                  {["PRESENT", "LATE", "ABSENT"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: status }))}
                      className={`text-xs px-2 py-1 rounded-lg transition-all ${
                        statuses[student.id] === status
                          ? status === "PRESENT"
                            ? "badge-green"
                            : status === "LATE"
                              ? "badge-yellow"
                              : "badge-red"
                          : "t-btn-secondary opacity-50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="t-btn-primary mt-4 w-full" onClick={save} disabled={saving}>
            {saving ? "Saving..." : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} />
                {existingRecords.length > 0 ? "Save Another Attendance Set" : "Save Attendance"}
              </span>
            )}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
