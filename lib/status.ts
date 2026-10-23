export type StatusTone = "green" | "red" | "amber" | "neutral" | "cyan";

const TONE_MAP: Record<string, StatusTone> = {
  // generic
  ACTIVE: "green",
  COMPLETED: "green",
  CONFIRMED: "green",
  PAID: "green",
  SIGNED: "green",
  TERMINATED: "red",
  DECLINED: "red",
  EXPIRED: "red",
  OVERDUE: "red",
  VOID: "red",
  BLOCKED: "red",
  REVERSED: "red",
  REFUNDED: "red",
  INACTIVE: "neutral",
  ARCHIVED: "neutral",
  DRAFT: "neutral",
  NOT_STARTED: "neutral",
  TODO: "neutral",
  UNAVAILABLE: "neutral",
  PENDING: "amber",
  SENT: "amber",
  READY: "amber",
  AWAITING_SIGNATURE: "amber",
  AWAITING_CLIENT: "amber",
  PARTIALLY_PAID: "amber",
  PARTIALLY_SIGNED: "amber",
  ONBOARDING: "amber",
  LIMITED: "amber",
  UNPAID: "amber",
  IN_PROGRESS: "cyan",
  VIEWED: "cyan",
};

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return "neutral";
  return TONE_MAP[status] ?? "neutral";
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export const toneClass: Record<StatusTone, string> = {
  green: "crm-badge-green",
  red: "crm-badge-red",
  amber: "crm-badge-amber",
  neutral: "crm-badge-neutral",
  cyan: "crm-badge-cyan",
};
