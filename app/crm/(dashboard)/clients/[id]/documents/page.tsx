import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState } from "@/components/crm/ui";
import { formatUKDate } from "@/lib/dates";
import { deriveContractStatus } from "@/lib/contracts";
import { deriveInvoiceStatus } from "@/lib/finance";
import { formatPence } from "@/lib/money";

export default async function ClientDocumentsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contracts, invoices, files] = await Promise.all([
    prisma.contract.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ where: { clientId: id }, include: { payments: true }, orderBy: { issueDate: "desc" } }),
    prisma.document.findMany({ where: { clientId: id, category: { in: ["BRIEF", "REPORT", "ASSET", "OTHER"] } }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel
        title="Contracts"
        action={
          <Link href={`/crm/documents/contracts/new?client=${id}`} className="text-xs flex items-center gap-1" style={{ color: "var(--crm-cyan)" }}>
            <Plus size={12} /> New
          </Link>
        }
      >
        {contracts.length === 0 ? (
          <EmptyState message="No contracts yet." />
        ) : (
          <ul className="space-y-2.5">
            {contracts.map((c) => {
              const d = deriveContractStatus(c);
              return (
                <li key={c.id}>
                  <Link href={`/crm/documents/contracts/${c.id}`} className="flex items-center justify-between gap-2 hover:underline">
                    <span className="text-sm truncate">{c.name}</span>
                    <Badge status={d.effectiveStatus} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Invoices"
        action={
          <Link href={`/crm/documents/invoices/new?client=${id}`} className="text-xs flex items-center gap-1" style={{ color: "var(--crm-cyan)" }}>
            <Plus size={12} /> New
          </Link>
        }
      >
        {invoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          <ul className="space-y-2.5">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/crm/documents/invoices/${inv.id}`} className="flex items-center justify-between gap-2 hover:underline">
                  <span className="text-sm truncate">
                    {inv.number} · {formatPence(inv.totalPence)}
                  </span>
                  <Badge status={deriveInvoiceStatus(inv)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Other Files" className="lg:col-span-2">
        {files.length === 0 ? (
          <EmptyState message="No other files uploaded." />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--crm-border)" }}>
            {files.map((f) => (
              <li key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">{f.name}</p>
                  <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {f.category} · {formatUKDate(f.createdAt)}
                  </p>
                </div>
                <a href={`/api/crm/files/${f.id}`} target="_blank" rel="noreferrer" className="crm-btn-ghost crm-btn p-1.5">
                  <Download size={13} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
