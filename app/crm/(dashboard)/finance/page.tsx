import Link from "next/link";
import { prisma } from "@/lib/db";
import { Panel, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { resolveDateRange, DATE_RANGE_LABELS, outstandingForInvoice, type DateRangePreset } from "@/lib/finance";

const PRESETS: DateRangePreset[] = ["this_month", "last_month", "last_30", "last_60", "last_90", "this_year", "all_time"];

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from, to } = await searchParams;
  const preset = (range as DateRangePreset) ?? "this_month";
  const { from: rangeFrom, to: rangeTo } = resolveDateRange(preset, from, to);

  const [payments, invoicesInRange, allOpenInvoices] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "CONFIRMED",
        paymentDate: { ...(rangeFrom ? { gte: rangeFrom } : {}), lte: rangeTo },
      },
      include: { invoice: { include: { client: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        status: { not: "VOID" },
        issueDate: { ...(rangeFrom ? { gte: rangeFrom } : {}), lte: rangeTo },
      },
    }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["VOID", "DRAFT"] } },
      include: { payments: true, client: true },
    }),
  ]);

  const totalReceived = payments.reduce((s, p) => s + p.amountPence, 0);
  const totalInvoiced = invoicesInRange.reduce((s, inv) => s + inv.totalPence, 0);
  const outstanding = allOpenInvoices.reduce((s, inv) => s + outstandingForInvoice(inv), 0);
  const overdue = allOpenInvoices
    .filter((inv) => inv.dueDate && inv.dueDate < new Date() && outstandingForInvoice(inv) > 0)
    .reduce((s, inv) => s + outstandingForInvoice(inv), 0);
  const expectedFuture = allOpenInvoices
    .filter((inv) => inv.dueDate && inv.dueDate >= new Date() && outstandingForInvoice(inv) > 0)
    .reduce((s, inv) => s + outstandingForInvoice(inv), 0);
  const paidCount = allOpenInvoices.filter((inv) => outstandingForInvoice(inv) <= 0).length;
  const unpaidCount = allOpenInvoices.filter((inv) => outstandingForInvoice(inv) > 0).length;

  // Monthly revenue — last 6 months, confirmed payments only
  const months: { label: string; year: number; month: number; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), year: d.getFullYear(), month: d.getMonth(), total: 0 });
  }
  const allConfirmedPayments = await prisma.payment.findMany({ where: { status: "CONFIRMED" } });
  for (const p of allConfirmedPayments) {
    const bucket = months.find((m) => m.year === p.paymentDate.getFullYear() && m.month === p.paymentDate.getMonth());
    if (bucket) bucket.total += p.amountPence;
  }
  const maxMonthly = Math.max(1, ...months.map((m) => m.total));

  // Revenue by client, within range
  const byClient = new Map<string, { id: string; name: string; total: number }>();
  for (const p of payments) {
    const key = p.invoice.clientId;
    const existing = byClient.get(key);
    if (existing) existing.total += p.amountPence;
    else byClient.set(key, { id: key, name: p.invoice.client.businessName, total: p.amountPence });
  }
  const clientBreakdown = [...byClient.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  const maxClient = Math.max(1, ...clientBreakdown.map((c) => c.total));

  const qs = (p: string) => {
    const params = new URLSearchParams();
    params.set("range", p);
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Link
              key={p}
              href={qs(p)}
              className="crm-badge"
              style={{ borderColor: preset === p ? "var(--crm-lime)" : "var(--crm-border-strong)", color: preset === p ? "var(--crm-lime)" : "var(--crm-text-dim)" }}
            >
              {DATE_RANGE_LABELS[p]}
            </Link>
          ))}
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={from} className="crm-input w-auto text-xs py-1.5" />
          <span className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
            to
          </span>
          <input type="date" name="to" defaultValue={to} className="crm-input w-auto text-xs py-1.5" />
          <button className="crm-btn crm-btn-ghost text-xs">Custom</button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Received" value={formatPence(totalReceived)} tone="green" />
        <Stat label="Invoiced" value={formatPence(totalInvoiced)} />
        <Stat label="Outstanding" value={formatPence(outstanding)} tone={outstanding > 0 ? "amber" : undefined} />
        <Stat label="Overdue" value={formatPence(overdue)} tone={overdue > 0 ? "red" : undefined} />
        <Stat label="Expected Future" value={formatPence(expectedFuture)} />
        <Stat label="Paid Invoices" value={paidCount} />
        <Stat label="Unpaid Invoices" value={unpaidCount} tone={unpaidCount > 0 ? "amber" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Monthly Revenue (last 6 months)">
          <div className="flex items-end gap-3 h-40">
            {months.map((m) => (
              <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="text-[10px]" style={{ color: "var(--crm-text-faint)" }}>
                  {m.total > 0 ? formatPence(m.total) : ""}
                </span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(3, (m.total / maxMonthly) * 100)}%`,
                    background: "var(--crm-lime)",
                    boxShadow: m.total > 0 ? "0 0 10px rgba(202,251,42,0.3)" : "none",
                  }}
                />
                <span className="text-[10px] crm-label">{m.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Revenue by Client (selected range)">
          {clientBreakdown.length === 0 ? (
            <EmptyState message="No revenue recorded in this range." />
          ) : (
            <div className="space-y-2.5">
              {clientBreakdown.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "var(--crm-text-dim)" }}>{c.name}</span>
                    <span style={{ color: "var(--crm-cyan)" }}>{formatPence(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--crm-bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.total / maxClient) * 100}%`, background: "var(--crm-cyan)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Payment History (selected range)">
        {payments.length === 0 ? (
          <EmptyState message="No payments recorded in this range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--crm-border)" }}>
                  <th className="py-2 px-2 crm-label">Date</th>
                  <th className="py-2 px-2 crm-label">Client</th>
                  <th className="py-2 px-2 crm-label">Invoice</th>
                  <th className="py-2 px-2 crm-label">Amount</th>
                  <th className="py-2 px-2 crm-label">Method</th>
                  <th className="py-2 px-2 crm-label">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: "var(--crm-border)" }}>
                    <td className="py-2.5 px-2">{formatUKDate(p.paymentDate)}</td>
                    <td className="py-2.5 px-2">{p.invoice.client.businessName}</td>
                    <td className="py-2.5 px-2">
                      <Link href={`/crm/documents/invoices/${p.invoiceId}`} className="hover:underline" style={{ color: "var(--crm-cyan)" }}>
                        {p.invoice.number}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2" style={{ color: "var(--crm-green)" }}>
                      {formatPence(p.amountPence)}
                    </td>
                    <td className="py-2.5 px-2 text-xs">{p.method?.replace("_", " ") ?? "—"}</td>
                    <td className="py-2.5 px-2 text-xs" style={{ color: "var(--crm-text-faint)" }}>
                      {p.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "amber" | "red" }) {
  const color = tone ? { green: "var(--crm-green)", amber: "var(--crm-amber)", red: "var(--crm-red)" }[tone] : "var(--crm-text)";
  return (
    <div className="crm-panel p-4">
      <p className="crm-label">{label}</p>
      <p className="text-xl font-bold crm-heading mt-1" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
