import Link from "next/link";
import { statusTone, statusLabel, toneClass } from "@/lib/status";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "green" | "red" | "amber" | "cyan";
  href?: string;
}) {
  const toneColor = tone
    ? { green: "var(--crm-green)", red: "var(--crm-red)", amber: "var(--crm-amber)", cyan: "var(--crm-cyan)" }[tone]
    : "var(--crm-text)";

  const content = (
    <div className="crm-panel p-4 flex flex-col gap-2 h-full hover:border-[var(--crm-border-strong)] transition-colors">
      <div className="flex items-center justify-between">
        <p className="crm-label">{label}</p>
        {Icon && <Icon size={14} style={{ color: "var(--crm-text-faint)" }} />}
      </div>
      <p className="text-2xl font-bold crm-heading" style={{ color: toneColor }}>
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`crm-panel flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--crm-border)" }}>
        <h2 className="crm-label" style={{ color: "var(--crm-cyan)", fontSize: "0.75rem" }}>
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}

export function Badge({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status);
  return <span className={`crm-badge ${toneClass[tone]}`}>{statusLabel(status)}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-center py-8" style={{ color: "var(--crm-text-faint)" }}>
      {message}
    </p>
  );
}

export function PriorityDot({ priority }: { priority: string }) {
  const color =
    priority === "URGENT"
      ? "var(--crm-red)"
      : priority === "HIGH"
      ? "var(--crm-amber)"
      : priority === "MEDIUM"
      ? "var(--crm-cyan)"
      : "var(--crm-text-faint)";
  return <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} title={priority} />;
}
