"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getAnnouncements } from "@/lib/api";
import { ANNOUNCEMENT_META, Announcement, AnnouncementType } from "@/lib/announcements";
import { Bell, Calendar, Megaphone } from "lucide-react";

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnnouncements()
      .then((res) => setAnnouncements(res.data.data || []))
      .catch((e: any) => setError(e?.response?.data?.detail || "Failed to load announcements"))
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
      ) : error ? (
        <div className="t-card text-center py-12">
          <Bell size={36} className="mx-auto mb-3" style={{ color: "var(--text-secondary)", opacity: 0.4 }} />
          <p className="t-text-secondary text-sm">{error}</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="t-card text-center py-12">
          <Bell size={36} className="mx-auto mb-3" style={{ color: "var(--text-secondary)", opacity: 0.4 }} />
          <p className="t-text-secondary text-sm">No announcements at this time.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {announcements.map((announcement) => {
            const meta = ANNOUNCEMENT_META[announcement.type as AnnouncementType] ?? ANNOUNCEMENT_META.NOTICE;
            return (
              <div key={announcement.id} className="t-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Megaphone size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span className="font-semibold t-text-primary text-sm">{announcement.title}</span>
                  </div>
                  <span
                    className="shrink-0"
                    style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 700 }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="t-text-secondary text-sm mb-3" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{announcement.message}</p>
                <div className="flex items-center gap-3 text-xs t-text-secondary" style={{ flexWrap: "wrap" }}>
                  {announcement.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {new Date(announcement.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  <span>{new Date(announcement.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
