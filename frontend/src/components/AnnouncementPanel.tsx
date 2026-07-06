"use client";

import Link from "next/link";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_META,
  ANNOUNCEMENT_PRIORITY_META,
  Announcement,
} from "@/lib/announcements";
import { Bell, ChevronRight, Megaphone } from "lucide-react";

type AnnouncementPanelProps = {
  announcements: Announcement[];
  href: string;
  emptyText?: string;
  actionLabel?: string;
};

export default function AnnouncementPanel({
  announcements,
  href,
  emptyText = "No announcements posted yet.",
  actionLabel = "View all",
}: AnnouncementPanelProps) {
  return (
    <div className="t-card announcement-panel">
      <div className="announcement-panel-header flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold t-text-primary flex items-center gap-2">
            <Bell size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
            Announcements
          </h2>
          <p className="t-text-secondary text-sm">Latest notices for your dashboard</p>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}
        >
          {actionLabel} <ChevronRight size={12} />
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="t-empty" style={{ minHeight: 212 }}>
          <Megaphone size={28} />
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const meta = ANNOUNCEMENT_META[announcement.type];
            const priorityMeta = ANNOUNCEMENT_PRIORITY_META[announcement.priority ?? "NORMAL"];
            return (
              <div
                key={announcement.id}
                className="announcement-item"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  borderLeft: `5px solid ${priorityMeta.color}`,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.83rem" }}>{announcement.title}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: priorityMeta.bg, color: priorityMeta.color }}>
                    {priorityMeta.emoji} {priorityMeta.label}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 7 }}>
                  {announcement.message.length > 110 ? `${announcement.message.slice(0, 110)}...` : announcement.message}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                  <span>{ANNOUNCEMENT_AUDIENCE_LABELS[announcement.target_roles] || announcement.target_roles}</span>
                  <span>{new Date(announcement.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
