import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate, formatUKDateTime } from "@/lib/dates";
import { outstandingForInvoice } from "@/lib/finance";
import { deriveContractStatus } from "@/lib/contracts";

export default async function ClientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: { where: { status: { not: "COMPLETED" } }, orderBy: { deadline: "asc" } },
      tasks: { where: { status: { not: "COMPLETED" } }, orderBy: { dueDate: "asc" }, take: 5 },
      invoices: { include: { payments: true }, orderBy: { issueDate: "desc" } },
      contracts: { orderBy: { createdAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 8, include: { user: true } },
      assignedTeamMember: true,
    },
  });

  if (!client) notFound();

  let services: string[] = [];
  try {
    services = client.servicesProvided ? JSON.parse(client.servicesProvided) : [];
  } catch {
    services = [];
  }

  const outstanding = client.invoices.reduce((sum, inv) => sum + outstandingForInvoice(inv), 0);
  const signedContracts = client.contracts.filter((c) => c.status === "SIGNED" || c.status === "TERMINATED");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Panel title="Business Details" className="lg:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Description" value={client.description} full />
          <Info label="Contact" value={client.mainContactName} />
          <Info label="Role" value={client.jobTitle} />
          <Info label="Email" value={client.email} />
          <Info label="Phone" value={client.phone} />
          <Info label="Service package" value={client.servicePackage} />
          <Info label="Monthly retainer" value={client.monthlyRetainerPence != null ? formatPence(client.monthlyRetainerPence) : null} />
          <Info label="Billing frequency" value={client.billingFrequency} />
          <Info label="Assigned team member" value={client.assignedTeamMember?.name} />
          <Info label="Next review" value={client.nextReviewDate ? formatUKDate(client.nextReviewDate) : null} />
        </div>
        {services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s} className="crm-badge crm-badge-cyan">
                {s}
              </span>
            ))}
          </div>
        )}
        {(client.objectives || client.priorities) && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: "var(--crm-border)" }}>
            {client.objectives && <Info label="Objectives" value={client.objectives} full />}
            {client.priorities && <Info label="Current priorities" value={client.priorities} full />}
          </div>
        )}
      </Panel>

      <Panel title="Contract">
        {client.contracts.length === 0 ? (
          <EmptyState message="No contracts yet." />
        ) : (
          <div className="space-y-3">
            {client.contracts.slice(0, 1).map((c) => {
              const d = deriveContractStatus(c);
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.name}</p>
                    <Badge status={d.effectiveStatus} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--crm-text-faint)" }}>
                    {formatUKDate(c.startDate)} → {formatUKDate(c.endDate)}
                  </p>
                </div>
              );
            })}
            <Link href={`/crm/clients/${client.id}/documents`} className="text-xs" style={{ color: "var(--crm-cyan)" }}>
              View all contracts →
            </Link>
          </div>
        )}
      </Panel>

      <Panel title="Active Projects">
        {client.projects.length === 0 ? (
          <EmptyState message="No active projects." />
        ) : (
          <ul className="space-y-2.5">
            {client.projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm truncate">{p.title}</p>
                  <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {formatUKDate(p.deadline)}
                  </p>
                </div>
                <Badge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Outstanding Tasks">
        {client.tasks.length === 0 ? (
          <EmptyState message="No open tasks." />
        ) : (
          <ul className="space-y-2.5">
            {client.tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <PriorityDot priority={t.priority} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{t.title}</p>
                  <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {formatUKDate(t.dueDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Finance">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "var(--crm-text-dim)" }}>Outstanding</span>
            <span style={{ color: outstanding > 0 ? "var(--crm-amber)" : "var(--crm-green)" }}>{formatPence(outstanding)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--crm-text-dim)" }}>Invoices</span>
            <span>{client.invoices.length}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--crm-text-dim)" }}>Signed contracts</span>
            <span>{signedContracts.length}</span>
          </div>
        </div>
        <Link href={`/crm/clients/${client.id}/finance`} className="crm-btn crm-btn-ghost w-full justify-center mt-4">
          View Finance
        </Link>
      </Panel>

      <Panel title="Recent Activity" className="lg:col-span-3">
        {client.activityLogs.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <ul className="space-y-2.5">
            {client.activityLogs.map((a) => (
              <li key={a.id} className="text-sm flex justify-between gap-4">
                <span style={{ color: "var(--crm-text)" }}>{a.description}</span>
                <span className="shrink-0 text-xs" style={{ color: "var(--crm-text-faint)" }}>
                  {formatUKDateTime(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="crm-label mb-0.5">{label}</p>
      <p style={{ color: "var(--crm-text)" }}>{value}</p>
    </div>
  );
}
