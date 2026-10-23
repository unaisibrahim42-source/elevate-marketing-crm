"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { CRM_NAV, pageTitleFor } from "@/lib/crm-nav";
import { logoutAction } from "@/lib/actions/auth-actions";
import NotificationBell from "./NotificationBell";
import type { NotificationItem } from "./NotificationBell";

export default function CrmShell({
  user,
  notifications,
  unreadCount,
  children,
}: {
  user: { name: string; jobTitle: string | null; role: string };
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="crm-root flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 flex flex-col border-r transition-transform lg:translate-x-0 lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--crm-sidebar)", borderColor: "var(--crm-border)" }}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Image src="/logo-white.png" alt="Elevate" width={120} height={75} className="h-10 w-auto" />
          <button
            className="lg:hidden crm-btn-ghost crm-btn p-1.5"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto crm-scrollbar">
          {CRM_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`crm-nav-item ${active ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={15} strokeWidth={2.25} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t space-y-2" style={{ borderColor: "var(--crm-border)" }}>
          <div className="px-2">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--crm-text)" }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--crm-text-dim)" }}>
              {user.jobTitle ?? user.role}
            </p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="crm-nav-item w-full justify-start" style={{ color: "var(--crm-text-dim)" }}>
              <LogOut size={15} strokeWidth={2.25} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 lg:px-7 py-4 border-b backdrop-blur"
          style={{ borderColor: "var(--crm-border)", background: "rgba(24,9,15,0.85)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden crm-btn-ghost crm-btn p-1.5"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
            <h1 className="crm-heading text-base lg:text-lg truncate" style={{ color: "var(--crm-cyan)" }}>
              {pageTitleFor(pathname)}
            </h1>
          </div>
          <NotificationBell initialItems={notifications} initialUnread={unreadCount} />
        </header>

        <main className="flex-1 p-4 lg:p-7 crm-scrollbar overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
