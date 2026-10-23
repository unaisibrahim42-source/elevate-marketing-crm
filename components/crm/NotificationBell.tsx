"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { formatUKDateTime } from "@/lib/dates";
import { markAllNotificationsRead } from "@/lib/actions/notification-actions";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationBell({
  initialItems,
  initialUnread,
}: {
  initialItems: NotificationItem[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative crm-btn-ghost crm-btn p-2"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {initialUnread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{ background: "var(--crm-lime)", color: "#140208" }}
          >
            {initialUnread > 9 ? "9+" : initialUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 crm-panel-raised crm-glow-lime z-30 max-h-96 overflow-y-auto crm-scrollbar"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--crm-border)" }}>
            <p className="crm-label">Notifications</p>
            {initialUnread > 0 && (
              <form action={markAllNotificationsRead}>
                <button type="submit" className="text-xs" style={{ color: "var(--crm-cyan)" }}>
                  Mark all read
                </button>
              </form>
            )}
          </div>
          {initialItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--crm-text-faint)" }}>
              Nothing yet.
            </p>
          ) : (
            <ul>
              {initialItems.map((n) => (
                <li
                  key={n.id}
                  className="px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: "var(--crm-border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: n.read ? "var(--crm-text-dim)" : "var(--crm-text)" }}>
                      {n.title}
                    </p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--crm-lime)" }} />}
                  </div>
                  {n.body && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--crm-text-faint)" }}>
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: "var(--crm-text-faint)" }}>
                    {formatUKDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
