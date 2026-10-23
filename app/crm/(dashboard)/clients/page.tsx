import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { outstandingForInvoice } from "@/lib/finance";
import type { Prisma } from "@prisma/client";

const STATUS_FILTERS = ["ALL", "ACTIVE", "ONBOARDING", "INACTIVE", "COMPLETED", "ARCHIVED"];
const SORT_OPTIONS: Record<string, Prisma.ClientOrderByWithRelationInput> = {
  recent: { updatedAt: "desc" },
  name: { businessName: "asc" },
  contract_end: { contractEnd: "asc" },
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const { q = "", status = "ALL", sort = "recent" } = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      ...(status !== "ALL" ? { status } : { status: { not: "ARCHIVED" } }),
      ...(q
        ? {
            OR: [
              { businessName: { contains: q } },
              { tradingName: { contains: q } },
              { mainContactName: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      projects: { where: { status: { not: "COMPLETED" } }, orderBy: { deadline: "asc" }, take: 1 },
      tasks: { where: { status: { not: "COMPLETED" } }, orderBy: { dueDate: "asc" }, take: 1 },
      invoices: { include: { payments: true } },
      contracts: true,
    },
    orderBy: SORT_OPTIONS[sort] ?? SORT_OPTIONS.recent,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form className="flex items-center gap-2 flex-1 max-w-md" method="get">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--crm-text-faint)" }} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search clients or contacts…"
              className="crm-input pl-8"
            />
          </div>
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="sort" value={sort} />
        </form>
        <Link href="/crm/clients/new" className="crm-btn crm-btn-primary">
          <Plus size={14} /> Add Client
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={`/crm/clients?status=${s}&q=${encodeURIComponent(q)}&sort=${sort}`}
              className="crm-badge"
              style={{
                borderColor: status === s ? "var(--crm-lime)" : "var(--crm-border-strong)",
                color: status === s ? "var(--crm-lime)" : "var(--crm-text-dim)",
              }}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="status" value={status} />
          <select name="sort" defaultValue={sort} className="crm-input crm-select w-auto text-xs py-1.5">
            <option value="recent">Recent activity</option>
            <option value="name">Name</option>
            <option value="contract_end">Contract end date</option>
          </select>
        </form>
      </div>

      {clients.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message={q || status !== "ALL" ? "No clients match that search." : "No clients yet — add your first one."} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {clients.map((c) => {
            const outstanding = c.invoices.reduce((sum, inv) => sum + outstandingForInvoice(inv), 0);
            return (
              <Link
                key={c.id}
                href={`/crm/clients/${c.id}`}
                className="crm-panel p-4 flex flex-col gap-2.5 hover:border-[var(--crm-cyan)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: "var(--crm-cyan)" }}>
                      {c.businessName}
                    </p>
                    {c.mainContactName && (
                      <p className="text-xs truncate" style={{ color: "var(--crm-text-dim)" }}>
                        {c.mainContactName}
                      </p>
                    )}
                  </div>
                  <Badge status={c.status} />
                </div>

                <div className="text-xs space-y-1" style={{ color: "var(--crm-text-dim)" }}>
                  {c.email && <p className="truncate">{c.email}</p>}
                  {c.phone && <p className="truncate">{c.phone}</p>}
                  <p className="truncate">{c.servicePackage ?? c.projects[0]?.title ?? "No active package"}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: "var(--crm-border)" }}>
                  <span style={{ color: "var(--crm-text-faint)" }}>
                    Next: {formatUKDate(c.tasks[0]?.dueDate ?? c.projects[0]?.deadline)}
                  </span>
                  {outstanding > 0 ? (
                    <span style={{ color: "var(--crm-amber)" }}>{formatPence(outstanding)} due</span>
                  ) : (
                    <span style={{ color: "var(--crm-green)" }}>Settled</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
