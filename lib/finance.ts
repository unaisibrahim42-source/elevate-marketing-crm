type PaymentLike = { amountPence: number; status: string };
type InvoiceLike = { totalPence: number; status: string; dueDate: Date | null; payments: PaymentLike[] };

export function paidAmountForInvoice(invoice: { payments: PaymentLike[] }): number {
  return invoice.payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((sum, p) => sum + p.amountPence, 0);
}

export function outstandingForInvoice(invoice: InvoiceLike): number {
  if (invoice.status === "VOID") return 0;
  const paid = paidAmountForInvoice(invoice);
  return Math.max(0, invoice.totalPence - paid);
}

export function isInvoiceOverdue(invoice: InvoiceLike): boolean {
  if (invoice.status === "VOID" || invoice.status === "PAID") return false;
  if (!invoice.dueDate) return false;
  return invoice.dueDate < new Date() && outstandingForInvoice(invoice) > 0;
}

/** The invoice's true payment state, derived from its payments rather than trusted blindly. */
export function deriveInvoiceStatus(invoice: InvoiceLike): string {
  if (invoice.status === "VOID" || invoice.status === "DRAFT") return invoice.status;
  const outstanding = outstandingForInvoice(invoice);
  if (outstanding <= 0) return "PAID";
  if (isInvoiceOverdue(invoice)) return "OVERDUE";
  const paid = paidAmountForInvoice(invoice);
  if (paid > 0) return "PARTIALLY_PAID";
  return invoice.status === "SENT" ? "SENT" : "UNPAID";
}

export type DateRangePreset =
  | "this_month"
  | "last_month"
  | "last_30"
  | "last_60"
  | "last_90"
  | "this_year"
  | "all_time"
  | "custom";

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): { from: Date | null; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  switch (preset) {
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to: lastDay };
    }
    case "last_30": {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from, to };
    }
    case "last_60": {
      const from = new Date(now);
      from.setDate(from.getDate() - 60);
      return { from, to };
    }
    case "last_90": {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return { from, to };
    }
    case "this_year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to };
    }
    case "custom": {
      const from = customFrom ? new Date(customFrom) : null;
      const toD = customTo ? new Date(customTo + "T23:59:59.999") : to;
      return { from, to: toD };
    }
    case "all_time":
    default:
      return { from: null, to };
  }
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30: "Last 30 days",
  last_60: "Last 60 days",
  last_90: "Last 90 days",
  this_year: "This year",
  all_time: "All time",
  custom: "Custom range",
};
