import Link from "next/link";
import { Plus, Download, Trash2, FileSignature, Receipt, FolderOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { deriveContractStatus } from "@/lib/contracts";
import { deriveInvoiceStatus, outstandingForInvoice } from "@/lib/finance";
import { uploadLibraryFileAction, deleteDocumentAction } from "@/lib/actions/document-actions";

const TABS = [
  { key: "contracts", label: "Contracts", icon: FileSignature },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "library", label: "Library", icon: FolderOpen },
];

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const { tab = "contracts", status } = await searchParams;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.key} href={`/crm/documents?tab=${t.key}`} className={`crm-btn ${tab === t.key ? "crm-btn-primary" : "crm-btn-ghost"}`}>
              <Icon size={14} /> {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "contracts" && <ContractsTab status={status} />}
      {tab === "invoices" && <InvoicesTab status={status} />}
      {tab === "library" && <LibraryTab />}
    </div>
  );
}

async function ContractsTab({ status }: { status?: string }) {
  const contracts = await prisma.contract.findMany({
    include: { client: true, signatories: true },
    orderBy: { createdAt: "desc" },
  });

  const withStatus = contracts.map((c) => ({ ...c, derived: deriveContractStatus(c) }));
  const filtered = status ? withStatus.filter((c) => c.derived.effectiveStatus === status || c.status === status) : withStatus;

  const filters = ["ACTIVE", "SENT", "VIEWED", "DRAFT", "EXPIRED", "DECLINED", "TERMINATED"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link href="/crm/documents?tab=contracts" className="crm-badge" style={{ borderColor: !status ? "var(--crm-lime)" : "var(--crm-border-strong)", color: !status ? "var(--crm-lime)" : "var(--crm-text-dim)" }}>
            All
          </Link>
          {filters.map((f) => (
            <Link key={f} href={`/crm/documents?tab=contracts&status=${f}`} className="crm-badge" style={{ borderColor: status === f ? "var(--crm-lime)" : "var(--crm-border-strong)", color: status === f ? "var(--crm-lime)" : "var(--crm-text-dim)" }}>
              {f.replace("_", " ")}
            </Link>
          ))}
        </div>
        <Link href="/crm/documents/contracts/new" className="crm-btn crm-btn-primary">
          <Plus size={14} /> New Contract
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No contracts here yet." />
        </div>
      ) : (
        <div className="crm-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--crm-border)" }}>
                <Th>Contract</Th>
                <Th>Client</Th>
                <Th>Value</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Signing</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: "var(--crm-border)" }}>
                  <td className="px-3 py-2.5">
                    <Link href={`/crm/documents/contracts/${c.id}`} className="hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{c.client.businessName}</td>
                  <td className="px-3 py-2.5">{c.valuePence != null ? formatPence(c.valuePence) : "—"}</td>
                  <td className="px-3 py-2.5">{formatUKDate(c.startDate)}</td>
                  <td className="px-3 py-2.5">{formatUKDate(c.endDate)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.signatories.filter((s) => s.status === "SIGNED").length}/{c.signatories.length} signed
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge status={c.derived.effectiveStatus} />
                    {c.derived.notYetActive && (
                      <span className="text-xs block mt-0.5" style={{ color: "var(--crm-text-faint)" }}>
                        not yet active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function InvoicesTab({ status }: { status?: string }) {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "VOID" } },
    include: { client: true, payments: true },
    orderBy: { issueDate: "desc" },
  });

  const withStatus = invoices.map((inv) => ({ ...inv, derived: deriveInvoiceStatus(inv) }));
  const filtered = status ? withStatus.filter((inv) => inv.derived === status) : withStatus;
  const filters = ["PAID", "PARTIALLY_PAID", "UNPAID", "OVERDUE", "SENT", "DRAFT"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link href="/crm/documents?tab=invoices" className="crm-badge" style={{ borderColor: !status ? "var(--crm-lime)" : "var(--crm-border-strong)", color: !status ? "var(--crm-lime)" : "var(--crm-text-dim)" }}>
            All
          </Link>
          {filters.map((f) => (
            <Link key={f} href={`/crm/documents?tab=invoices&status=${f}`} className="crm-badge" style={{ borderColor: status === f ? "var(--crm-lime)" : "var(--crm-border-strong)", color: status === f ? "var(--crm-lime)" : "var(--crm-text-dim)" }}>
              {f.replace("_", " ")}
            </Link>
          ))}
        </div>
        <Link href="/crm/documents/invoices/new" className="crm-btn crm-btn-primary">
          <Plus size={14} /> New Invoice
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No invoices here yet." />
        </div>
      ) : (
        <div className="crm-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--crm-border)" }}>
                <Th>Invoice</Th>
                <Th>Client</Th>
                <Th>Issued</Th>
                <Th>Due</Th>
                <Th>Total</Th>
                <Th>Outstanding</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: "var(--crm-border)" }}>
                  <td className="px-3 py-2.5">
                    <Link href={`/crm/documents/invoices/${inv.id}`} className="hover:underline font-medium">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{inv.client.businessName}</td>
                  <td className="px-3 py-2.5">{formatUKDate(inv.issueDate)}</td>
                  <td className="px-3 py-2.5">{formatUKDate(inv.dueDate)}</td>
                  <td className="px-3 py-2.5">{formatPence(inv.totalPence)}</td>
                  <td className="px-3 py-2.5">{formatPence(outstandingForInvoice(inv))}</td>
                  <td className="px-3 py-2.5">
                    <Badge status={inv.derived} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function LibraryTab() {
  const [documents, clients] = await Promise.all([
    prisma.document.findMany({
      where: { category: { in: ["BRIEF", "REPORT", "ASSET", "OTHER"] } },
      include: { client: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Upload File</p>
        <form action={uploadLibraryFileAction} className="flex flex-wrap gap-2 items-center">
          <input type="file" name="file" required className="crm-input w-auto" />
          <input name="name" placeholder="Display name (optional)" className="crm-input w-auto" />
          <select name="category" defaultValue="OTHER" className="crm-input crm-select w-auto">
            {["BRIEF", "REPORT", "ASSET", "OTHER"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="clientId" defaultValue="" className="crm-input crm-select w-auto">
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName}
              </option>
            ))}
          </select>
          <button type="submit" className="crm-btn crm-btn-primary">
            Upload
          </button>
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No files uploaded yet." />
        </div>
      ) : (
        <div className="crm-panel divide-y" style={{ borderColor: "var(--crm-border)" }}>
          {documents.map((d) => (
            <div key={d.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm truncate">{d.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                  {d.category} · {d.client?.businessName ?? "No client"} · {d.uploadedBy?.name ?? "—"} · {formatUKDate(d.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`/api/crm/files/${d.id}`} target="_blank" rel="noreferrer" className="crm-btn-ghost crm-btn p-1.5">
                  <Download size={13} />
                </a>
                <form action={deleteDocumentAction.bind(null, d.id)}>
                  <button className="crm-btn-ghost crm-btn p-1.5">
                    <Trash2 size={13} />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 crm-label font-semibold" style={{ fontSize: "0.6875rem" }}>
      {children}
    </th>
  );
}
