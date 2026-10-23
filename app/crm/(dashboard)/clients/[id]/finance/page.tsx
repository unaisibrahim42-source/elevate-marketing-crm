import Link from "next/link";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { deriveInvoiceStatus, outstandingForInvoice, paidAmountForInvoice } from "@/lib/finance";

export default async function ClientFinanceTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoices = await prisma.invoice.findMany({
    where: { clientId: id },
    include: { payments: true },
    orderBy: { issueDate: "desc" },
  });

  const totalPaid = invoices.reduce((s, inv) => s + paidAmountForInvoice(inv), 0);
  const totalOutstanding = invoices.reduce((s, inv) => s + outstandingForInvoice(inv), 0);
  const totalInvoiced = invoices.filter((i) => i.status !== "VOID").reduce((s, inv) => s + inv.totalPence, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="crm-panel p-4">
          <p className="crm-label">Total Invoiced</p>
          <p className="text-xl font-bold crm-heading mt-1">{formatPence(totalInvoiced)}</p>
        </div>
        <div className="crm-panel p-4">
          <p className="crm-label">Total Paid</p>
          <p className="text-xl font-bold crm-heading mt-1" style={{ color: "var(--crm-green)" }}>
            {formatPence(totalPaid)}
          </p>
        </div>
        <div className="crm-panel p-4">
          <p className="crm-label">Outstanding</p>
          <p className="text-xl font-bold crm-heading mt-1" style={{ color: totalOutstanding > 0 ? "var(--crm-amber)" : "var(--crm-text)" }}>
            {formatPence(totalOutstanding)}
          </p>
        </div>
      </div>

      <Panel title="Invoices">
        {invoices.length === 0 ? (
          <EmptyState message="No invoices for this client." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--crm-border)" }}>
                  <th className="py-2 crm-label">Invoice</th>
                  <th className="py-2 crm-label">Issued</th>
                  <th className="py-2 crm-label">Total</th>
                  <th className="py-2 crm-label">Outstanding</th>
                  <th className="py-2 crm-label">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: "var(--crm-border)" }}>
                    <td className="py-2.5">
                      <Link href={`/crm/documents/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="py-2.5">{formatUKDate(inv.issueDate)}</td>
                    <td className="py-2.5">{formatPence(inv.totalPence)}</td>
                    <td className="py-2.5">{formatPence(outstandingForInvoice(inv))}</td>
                    <td className="py-2.5">
                      <Badge status={deriveInvoiceStatus(inv)} />
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
