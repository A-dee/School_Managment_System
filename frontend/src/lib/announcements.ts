import { Bell, CalendarDays, Palmtree } from "lucide-react";

export type AnnouncementType = "NOTICE" | "EVENT" | "HOLIDAY";

export type Announcement = {
  id: number;
  title: string;
  message: string;
  type: AnnouncementType;
  event_date: string | null;
  target_roles: string;
  created_by: number;
  creator_name?: string | null;
  created_at: string;
};

export const ANNOUNCEMENT_META: Record<AnnouncementType, { label: string; color: string; bg: string; Icon: any }> = {
  NOTICE: { label: "Notice", color: "#6366f1", bg: "rgba(99,102,241,0.12)", Icon: Bell },
  EVENT: { label: "Event", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: CalendarDays },
  HOLIDAY: { label: "Holiday", color: "#22c55e", bg: "rgba(34,197,94,0.12)", Icon: Palmtree },
};

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<string, string> = {
  ALL: "Everyone",
  STUDENT: "Students",
  TEACHER: "Staff",
  PARENT: "Parents",
  "STUDENT,PARENT": "Students & Parents",
  "STUDENT,TEACHER": "Students & Staff",
  "TEACHER,PARENT": "Staff & Parents",
  "STUDENT,TEACHER,PARENT": "Students, Staff & Parents",
};

export const ANNOUNCEMENT_AUDIENCE_OPTIONS = [
  { val: "ALL", label: "Everyone" },
  { val: "STUDENT", label: "Students" },
  { val: "TEACHER", label: "Staff" },
  { val: "PARENT", label: "Parents" },
  { val: "STUDENT,PARENT", label: "Students & Parents" },
  { val: "STUDENT,TEACHER", label: "Students & Staff" },
  { val: "TEACHER,PARENT", label: "Staff & Parents" },
  { val: "STUDENT,TEACHER,PARENT", label: "Students, Staff & Parents" },
] as const;

export function getAnnouncementErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.detail || fallback;
}
