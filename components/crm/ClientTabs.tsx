"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/documents", label: "Documents" },
  { href: "/finance", label: "Finance" },
  { href: "/contacts", label: "Contacts" },
  { href: "/notes", label: "Notes & Activity" },
];

export default function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/crm/clients/${clientId}`;

  return (
    <nav className="flex gap-1 mt-5 overflow-x-auto crm-scrollbar border-t pt-3" style={{ borderColor: "var(--crm-border)" }}>
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded whitespace-nowrap transition-colors"
            style={{
              color: active ? "#140208" : "var(--crm-text-dim)",
              background: active ? "var(--crm-lime)" : "transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
