import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate, isOverdue } from "@/lib/dates";
import { updatePartnerAction } from "@/lib/actions/partner-actions";
import { createTaskAction, setTaskStatusAction } from "@/lib/actions/task-actions";
import InlineStatusSelect from "@/components/crm/InlineStatusSelect";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "AWAITING_CLIENT", "BLOCKED", "COMPLETED"];

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      user: true,
      tasks: { include: { client: true, project: true }, orderBy: { dueDate: "asc" } },
      allocationSplits: { include: { allocation: true }, orderBy: { allocation: { createdAt: "desc" } } },
    },
  });

  if (!partner) notFound();

  const [assignedProjects, activity] = await Promise.all([
    prisma.project.findMany({
      where: { assignees: { some: { userId: partner.userId } }, status: { not: "COMPLETED" } },
      include: { client: true },
      orderBy: { deadline: "asc" },
    }),
    prisma.activityLog.findMany({ where: { userId: partner.userId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const completed = partner.tasks.filter((t) => t.status === "COMPLETED");
  const outstanding = partner.tasks.filter((t) => t.status !== "COMPLETED");
  const overdue = outstanding.filter((t) => isOverdue(t.dueDate));

  const updateAction = updatePartnerAction.bind(null, partner.id);
  const createForPartner = async (formData: FormData) => {
    "use server";
    formData.set("partnerId", partner.id);
    await createTaskAction(formData);
  };

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4">
        <h1 className="crm-heading text-xl" style={{ color: "var(--crm-cyan)" }}>
          {partner.name}
        </h1>
        <p className="text-sm" style={{ color: "var(--crm-text-dim)" }}>
          {partner.role} · {partner.user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Profile & Shareholding">
          <form action={updateAction} className="space-y-3">
            <div>
              <label className="crm-label block mb-1.5">Role</label>
              <input name="role" defaultValue={partner.role} className="crm-input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="crm-label block mb-1.5">Shareholding %</label>
                <input name="shareholdingPct" type="number" step="0.1" defaultValue={partner.shareholdingPct} className="crm-input" />
              </div>
              <div>
                <label className="crm-label block mb-1.5">Profit share %</label>
                <input name="profitSharePct" type="number" step="0.1" defaultValue={partner.profitSharePct} className="crm-input" />
              </div>
            </div>
            <div>
              <label className="crm-label block mb-1.5">Responsibilities</label>
              <textarea name="responsibilities" defaultValue={partner.responsibilities ?? ""} rows={3} className="crm-input resize-none" />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--crm-text-dim)" }}>
              <input type="checkbox" name="active" defaultChecked={partner.active} /> Active partner
            </label>
            <button type="submit" className="crm-btn crm-btn-primary w-full justify-center">
              Save
            </button>
          </form>
        </Panel>

        <Panel title="Summary">
          <div className="space-y-2 text-sm">
            <Row label="Outstanding tasks" value={outstanding.length} />
            <Row label="Overdue tasks" value={overdue.length} tone={overdue.length > 0 ? "red" : undefined} />
            <Row label="Completed tasks" value={completed.length} tone="green" />
            <Row label="Active projects" value={assignedProjects.length} />
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--crm-border)" }}>
            <p className="crm-label mb-2">Active Projects</p>
            {assignedProjects.length === 0 ? (
              <EmptyState message="No active projects assigned." />
            ) : (
              <ul className="space-y-1.5">
                {assignedProjects.map((p) => (
                  <li key={p.id} className="text-sm truncate">
                    {p.title} <span style={{ color: "var(--crm-text-faint)" }}>({p.client.businessName})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Distribution History">
          {partner.allocationSplits.length === 0 ? (
            <EmptyState message="No allocations yet." />
          ) : (
            <ul className="space-y-2.5">
              {partner.allocationSplits.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--crm-text-dim)" }}>{s.allocation.periodLabel}</span>
                  <span style={{ color: "var(--crm-cyan)" }}>{formatPence(s.amountPence)}</span>
                  <Badge status={s.allocation.paid ? "PAID" : "PENDING"} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Tasks">
        <form action={createForPartner} className="flex flex-wrap gap-2 mb-4">
          <input name="title" placeholder="New task for this partner…" required className="crm-input flex-1 min-w-48" />
          <input name="dueDate" type="date" className="crm-input w-auto" />
          <select name="priority" defaultValue="MEDIUM" className="crm-input crm-select w-auto">
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button className="crm-btn crm-btn-primary">Add</button>
        </form>

        {partner.tasks.length === 0 ? (
          <EmptyState message="No tasks assigned to this partner." />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--crm-border)" }}>
            {partner.tasks.map((t) => (
              <li key={t.id} className="py-2.5 flex items-center gap-3">
                <PriorityDot priority={t.priority} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{t.title}</p>
                  <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                    {[t.client?.businessName, t.project?.title].filter(Boolean).join(" · ") || "Internal"}
                  </p>
                </div>
                <span className="text-xs" style={{ color: isOverdue(t.dueDate) && t.status !== "COMPLETED" ? "var(--crm-red)" : "var(--crm-text-faint)" }}>
                  {formatUKDate(t.dueDate)}
                </span>
                <InlineStatusSelect value={t.status} options={STATUS_OPTIONS} onChange={setTaskStatusAction.bind(null, t.id)} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent Activity">
        {activity.length === 0 ? (
          <EmptyState message="No recent activity." />
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="text-sm flex justify-between gap-4">
                <span>{a.description}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--crm-text-faint)" }}>
                  {formatUKDate(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string | number; tone?: "red" | "green" }) {
  const color = tone ? { red: "var(--crm-red)", green: "var(--crm-green)" }[tone] : "var(--crm-text)";
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--crm-text-dim)" }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
