"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Megaphone, Calendar, Bell } from "lucide-react";

const typeColors: Record<string, string> = {
  NOTICE: "badge-blue",
  EVENT: "badge-green",
  HOLIDAY: "badge-yellow",
};

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/announcements/")
      .then(res => setAnnouncements(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold t-text-primary">Announcements</h1>
        <p className="t-text-secondary text-sm mt-1">School notices and updates from management</p>
      </div>

      {loading ? (
        <p className="t-text-secondary text-sm">Loading...</p>
      ) : announcements.length === 0 ? (
        <div className="t-card text-center py-12">
          <Bell size={36} className="mx-auto mb-3" style={{ color: "var(--text-secondary)", opacity: 0.4 }} />
          <p className="t-text-secondary text-sm">No announcements at this time.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {announcements.map((a: any) => (
            <div key={a.id} className="t-card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Megaphone size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span className="font-semibold t-text-primary text-sm">{a.title}</span>
                </div>
                <span className={`${typeColors[a.type] || "badge-blue"} shrink-0`} style={{ fontSize: "0.68rem" }}>
                  {a.type}
                </span>
              </div>
              <p className="t-text-secondary text-sm mb-3" style={{ lineHeight: 1.6 }}>{a.message}</p>
              <div className="flex items-center gap-3 text-xs t-text-secondary">
                {a.event_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {a.event_date}
                  </span>
                )}
                <span>{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
