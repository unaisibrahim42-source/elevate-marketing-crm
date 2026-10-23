import Link from "next/link";
import {
  Users,
  FolderKanban,
  CalendarClock,
  AlertTriangle,
  Wallet,
  Receipt,
  FileSignature,
  Clock3,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { StatCard, Panel, Badge, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate, formatUKDateTime, isOverdue, isDueToday, isDueThisWeek } from "@/lib/dates";
import { outstandingForInvoice } from "@/lib/finance";
import { deriveContractStatus, isAwaitingSignature } from "@/lib/contracts";
import AnnouncementPanel from "@/components/crm/AnnouncementPanel";
import NewsPanel from "@/components/crm/NewsPanel";
import { getSetting } from "@/lib/actions/settings-actions";

type DashboardPanels = { activity: boolean; deadlines: boolean; clients: boolean; finance: boolean; feed: boolean; news: boolean };

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [
    activeClients,
    activeProjects,
    openTasks,
    invoicesOpen,
    contracts,
    paymentsThisMonth,
    paymentsLastMonth,
    recentActivity,
    clients,
    announcements,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { status: { in: ["IN_PROGRESS", "NOT_STARTED", "AWAITING_CLIENT", "BLOCKED"] } } }),
    prisma.task.findMany({
      where: { status: { not: "COMPLETED" } },
      include: { client: true, project: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["VOID"] } },
      include: { payments: true, client: true },
    }),
    prisma.contract.findMany({ include: { client: true } }),
    prisma.payment.aggregate({
      where: { status: "CONFIRMED", paymentDate: { gte: startOfMonth } },
      _sum: { amountPence: true },
    }),
    prisma.payment.aggregate({
      where: { status: "CONFIRMED", paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amountPence: true },
    }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: true, client: true } }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      include: {
        projects: { where: { status: { not: "COMPLETED" } }, orderBy: { deadline: "asc" }, take: 1 },
        tasks: { where: { status: { not: "COMPLETED" } }, orderBy: { dueDate: "asc" }, take: 1 },
        invoices: { include: { payments: true } },
        contracts: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { author: true } }),
  ]);

  const panels = await getSetting<DashboardPanels>("dashboard_panels", {
    activity: true,
    deadlines: true,
    clients: true,
    finance: true,
    feed: true,
    news: true,
  });

  const tasksDueToday = openTasks.filter((t) => isDueToday(t.dueDate));
  const tasksOverdue = openTasks.filter((t) => isOverdue(t.dueDate));
  const tasksThisWeek = openTasks.filter((t) => isDueThisWeek(t.dueDate));

  const outstandingTotal = invoicesOpen.reduce((sum, inv) => sum + outstandingForInvoice(inv), 0);
  const overdueTotal = invoicesOpen
    .filter((inv) => inv.dueDate && inv.dueDate < now && outstandingForInvoice(inv) > 0)
    .reduce((sum, inv) => sum + outstandingForInvoice(inv), 0);

  const contractsWithStatus = contracts.map((c) => ({ ...c, derived: deriveContractStatus(c) }));
  const contractsActive = contractsWithStatus.filter((c) => c.derived.effectiveStatus === "ACTIVE").length;
  const contractsAwaiting = contractsWithStatus.filter((c) => isAwaitingSignature(c.status)).length;

  const revenueThisMonth = paymentsThisMonth._sum.amountPence ?? 0;
  const revenueLastMonth = paymentsLastMonth._sum.amountPence ?? 0;

  const upcomingContracts = contractsWithStatus
    .filter((c) => c.endDate && c.endDate >= now)
    .sort((a, b) => (a.endDate!.getTime() - b.endDate!.getTime()))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Clients" value={activeClients} icon={Users} href="/crm/clients" />
        <StatCard label="Active Projects" value={activeProjects} icon={FolderKanban} href="/crm/projects" />
        <StatCard
          label="Tasks Due Today"
          value={tasksDueToday.length}
          icon={Clock3}
          tone={tasksDueToday.length > 0 ? "amber" : undefined}
          href="/crm/tasks?view=today"
        />
        <StatCard
          label="Overdue Tasks"
          value={tasksOverdue.length}
          icon={AlertTriangle}
          tone={tasksOverdue.length > 0 ? "red" : undefined}
          href="/crm/tasks?view=overdue"
        />
        <StatCard label="Revenue This Month" value={formatPence(revenueThisMonth)} icon={Wallet} tone="green" href="/crm/finance" />
        <StatCard
          label="Outstanding Balance"
          value={formatPence(outstandingTotal)}
          icon={Receipt}
          tone={outstandingTotal > 0 ? "amber" : undefined}
          href="/crm/finance"
        />
        <StatCard label="Contracts In Effect" value={contractsActive} icon={FileSignature} tone="green" href="/crm/documents?tab=contracts" />
        <StatCard
          label="Awaiting Signature"
          value={contractsAwaiting}
          icon={CalendarClock}
          tone={contractsAwaiting > 0 ? "amber" : undefined}
          href="/crm/documents?tab=contracts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming deadlines */}
        {panels.deadlines && (
        <Panel title="Upcoming Deadlines" className="lg:col-span-1">
          {tasksThisWeek.length === 0 && upcomingContracts.length === 0 ? (
            <EmptyState message="Nothing due this week." />
          ) : (
            <ul className="space-y-2.5">
              {tasksThisWeek.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link href={`/crm/tasks?open=${t.id}`} className="flex items-start gap-2 group">
                    <PriorityDot priority={t.priority} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate group-hover:underline" style={{ color: "var(--crm-text)" }}>
                        {t.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                        {t.client?.businessName ?? t.project?.title ?? "Internal"} · {formatUKDate(t.dueDate)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
              {upcomingContracts.map((c) => (
                <li key={c.id}>
                  <Link href={`/crm/documents?tab=contracts&open=${c.id}`} className="flex items-start gap-2 group">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-1.5" style={{ background: "var(--crm-cyan)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate group-hover:underline">{c.name} ends</p>
                      <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                        {c.client.businessName} · {formatUKDate(c.endDate)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        )}

        {/* Finance snapshot */}
        {panels.finance && (
        <Panel title="Finance Snapshot" className="lg:col-span-1">
          <div className="space-y-3">
            <Row label="Received this month" value={formatPence(revenueThisMonth)} tone="green" />
            <Row label="Received last month" value={formatPence(revenueLastMonth)} />
            <Row label="Outstanding invoices" value={formatPence(outstandingTotal)} tone={outstandingTotal > 0 ? "amber" : undefined} />
            <Row label="Overdue invoices" value={formatPence(overdueTotal)} tone={overdueTotal > 0 ? "red" : undefined} />
          </div>
          <Link href="/crm/finance" className="crm-btn crm-btn-ghost w-full mt-4 justify-center">
            Open Finance
          </Link>
        </Panel>
        )}

        {/* Activity feed */}
        {panels.activity && (
        <Panel title="Recent Activity" className="lg:col-span-1">
          {recentActivity.length === 0 ? (
            <EmptyState message="No activity recorded yet." />
          ) : (
            <ul className="space-y-3 crm-scrollbar max-h-64 overflow-y-auto">
              {recentActivity.map((a) => (
                <li key={a.id} className="text-sm">
                  <p style={{ color: "var(--crm-text)" }}>{a.description}</p>
                  <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {a.user?.name ?? "System"} · {formatUKDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        )}
      </div>

      {/* Client overview */}
      {panels.clients && (
      <Panel
        title="Client Overview"
        action={
          <Link href="/crm/clients" className="text-xs" style={{ color: "var(--crm-cyan)" }}>
            View all →
          </Link>
        }
      >
        {clients.length === 0 ? (
          <EmptyState message="No active clients yet. Add your first client to get started." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {clients.map((c) => {
              const outstanding = c.invoices.reduce((sum, inv) => sum + outstandingForInvoice(inv), 0);
              const contract = c.contracts[0];
              return (
                <Link
                  key={c.id}
                  href={`/crm/clients/${c.id}`}
                  className="crm-panel-raised p-3.5 flex flex-col gap-2 hover:border-[var(--crm-cyan)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate" style={{ color: "var(--crm-cyan)" }}>
                      {c.businessName}
                    </p>
                    <Badge status={c.status} />
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--crm-text-dim)" }}>
                    {c.projects[0]?.title ?? "No active project"}
                  </p>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span style={{ color: "var(--crm-text-faint)" }}>
                      Next: {formatUKDate(c.tasks[0]?.dueDate ?? c.projects[0]?.deadline)}
                    </span>
                    {outstanding > 0 && <span style={{ color: "var(--crm-amber)" }}>{formatPence(outstanding)} due</span>}
                  </div>
                  {contract && <Badge status={deriveContractStatus(contract).effectiveStatus} />}
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
      )}

      {(panels.feed || panels.news) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {panels.feed && (
          <AnnouncementPanel announcements={announcements.map((a) => ({
            id: a.id,
            title: a.title,
            body: a.body,
            authorName: a.author?.name ?? "Team",
            createdAt: a.createdAt.toISOString(),
          }))} />
        )}
        {panels.news && <NewsPanel />}
      </div>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "red" }) {
  const color = tone ? { green: "var(--crm-green)", amber: "var(--crm-amber)", red: "var(--crm-red)" }[tone] : "var(--crm-text)";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--crm-text-dim)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
