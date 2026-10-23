import { Panel, EmptyState } from "@/components/crm/ui";
import { formatUKDateTime } from "@/lib/dates";
import { createAnnouncementAction } from "@/lib/actions/announcement-actions";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export default function AnnouncementPanel({ announcements }: { announcements: AnnouncementItem[] }) {
  return (
    <Panel title="Internal Announcements">
      <form action={createAnnouncementAction} className="space-y-2 mb-4">
        <input name="title" placeholder="Announcement title" required className="crm-input" />
        <textarea name="body" placeholder="What's the update?" required rows={2} className="crm-input resize-none" />
        <button type="submit" className="crm-btn crm-btn-primary">
          Post
        </button>
      </form>

      {announcements.length === 0 ? (
        <EmptyState message="No announcements yet." />
      ) : (
        <ul className="space-y-3 crm-scrollbar max-h-56 overflow-y-auto">
          {announcements.map((a) => (
            <li key={a.id} className="border-b pb-2.5 last:border-b-0" style={{ borderColor: "var(--crm-border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--crm-text)" }}>
                {a.title}
              </p>
              <p className="text-sm" style={{ color: "var(--crm-text-dim)" }}>
                {a.body}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--crm-text-faint)" }}>
                {a.authorName} · {formatUKDateTime(a.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
