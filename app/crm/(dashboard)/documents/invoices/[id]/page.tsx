import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Ban, Send, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { deriveInvoiceStatus, outstandingForInvoice, paidAmountForInvoice } from "@/lib/finance";
import { recordPaymentAction, voidInvoiceAction, sendInvoiceAction, reversePaymentAction } from "@/lib/actions/invoice-actions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, payments: { orderBy: { paymentDate: "desc" } }, fileDocument: true, project: true },
  });

  if (!invoice) notFound();

  const status = deriveInvoiceStatus(invoice);
  const outstanding = outstandingForInvoice(invoice);
  const paid = paidAmountForInvoice(invoice);

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/crm/clients/${invoice.clientId}`} className="crm-label" style={{ color: "var(--crm-cyan)" }}>
            {invoice.client.businessName}
          </Link>
          <h1 className="crm-heading text-xl mt-1">{invoice.number}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge status={status} />
            <span className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              Issued {formatUKDate(invoice.issueDate)} · Due {formatUKDate(invoice.dueDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "DRAFT" && (
            <form action={sendInvoiceAction.bind(null, invoice.id)}>
              <button className="crm-btn crm-btn-ghost">
                <Send size={13} /> Mark Sent
              </button>
            </form>
          )}
          {invoice.status !== "VOID" && outstanding > 0 && (
            <form action={voidInvoiceAction.bind(null, invoice.id)}>
              <button className="crm-btn crm-btn-danger">
                <Ban size={13} /> Void
              </button>
            </form>
          )}
          {invoice.fileDocumentId && (
            <a href={`/api/crm/files/${invoice.fileDocumentId}`} target="_blank" rel="noreferrer" className="crm-btn crm-btn-ghost">
              <Download size={13} /> File
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Summary">
          <div className="space-y-2 text-sm">
            <Row label="Amount" value={formatPence(invoice.amountPence)} />
            <Row label="VAT" value={formatPence(invoice.vatPence)} />
            <Row label="Total" value={formatPence(invoice.totalPence)} strong />
            <Row label="Paid" value={formatPence(paid)} tone="green" />
            <Row label="Outstanding" value={formatPence(outstanding)} tone={outstanding > 0 ? "amber" : undefined} />
          </div>
          {invoice.description && (
            <p className="text-sm mt-4 pt-4 border-t" style={{ borderColor: "var(--crm-border)", color: "var(--crm-text-dim)" }}>
              {invoice.description}
            </p>
          )}
          {invoice.project && (
            <p className="text-xs mt-2" style={{ color: "var(--crm-text-faint)" }}>
              Project: {invoice.project.title}
            </p>
          )}
          {invoice.ocrExtracted && (
            <p className="text-xs mt-2" style={{ color: "var(--crm-cyan)" }}>
              Created from a scanned document — values were confirmed manually.
            </p>
          )}
        </Panel>

        <Panel title="Record Payment" className="lg:col-span-2">
          {invoice.status === "VOID" ? (
            <EmptyState message="This invoice is void." />
          ) : outstanding <= 0 ? (
            <p className="text-sm" style={{ color: "var(--crm-green)" }}>
              Fully paid.
            </p>
          ) : (
            <form action={recordPaymentAction.bind(null, invoice.id)} className="flex flex-wrap gap-2">
              <input name="amount" type="number" step="0.01" max={outstanding / 100} placeholder={`Up to £${(outstanding / 100).toFixed(2)}`} required className="crm-input w-36" />
              <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="crm-input w-auto" />
              <select name="method" defaultValue="BANK_TRANSFER" className="crm-input crm-select w-auto">
                {["BANK_TRANSFER", "CARD", "CASH", "OTHER"].map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input name="notes" placeholder="Notes (optional)" className="crm-input flex-1 min-w-32" />
              <button type="submit" className="crm-btn crm-btn-primary">
                Record Payment
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--crm-border)" }}>
            <p className="crm-label mb-2">Payment History</p>
            {invoice.payments.length === 0 ? (
              <EmptyState message="No payments recorded." />
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--crm-border)" }}>
                {invoice.payments.map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm" style={{ color: p.status === "REVERSED" ? "var(--crm-text-faint)" : "var(--crm-text)", textDecoration: p.status === "REVERSED" ? "line-through" : "none" }}>
                        {formatPence(p.amountPence)} · {p.method?.replace("_", " ") ?? "—"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                        {formatUKDate(p.paymentDate)} {p.notes ? `· ${p.notes}` : ""}
                      </p>
                    </div>
                    {p.status === "CONFIRMED" && (
                      <form action={reversePaymentAction.bind(null, p.id)}>
                        <button className="crm-btn-ghost crm-btn p-1.5" title="Reverse payment">
                          <RotateCcw size={13} />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: "green" | "amber"; strong?: boolean }) {
  const color = tone ? { green: "var(--crm-green)", amber: "var(--crm-amber)" }[tone] : "var(--crm-text)";
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--crm-text-dim)" }}>{label}</span>
      <span style={{ color, fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}
