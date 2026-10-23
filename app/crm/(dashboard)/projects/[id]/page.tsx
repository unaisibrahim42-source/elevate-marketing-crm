import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatUKDate } from "@/lib/dates";
import { addMilestoneAction, toggleMilestoneAction } from "@/lib/actions/project-actions";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      assignees: { include: { user: true } },
      tasks: { orderBy: { dueDate: "asc" } },
      documents: true,
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/crm/clients/${project.clientId}`} className="crm-label" style={{ color: "var(--crm-cyan)" }}>
            {project.client.businessName}
          </Link>
          <h1 className="crm-heading text-xl mt-1">{project.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge status={project.status} />
            <PriorityDot priority={project.priority} />
            <span className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              {formatUKDate(project.startDate)} → {formatUKDate(project.deadline)}
            </span>
          </div>
        </div>
        <Link href={`/crm/projects/${project.id}/edit`} className="crm-btn crm-btn-ghost">
          <Pencil size={13} /> Edit
        </Link>
      </div>

      <div className="crm-panel p-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="crm-label">Progress</p>
          <p className="text-sm font-semibold">{project.progressPct}%</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--crm-bg)" }}>
          <div className="h-full" style={{ width: `${project.progressPct}%`, background: "var(--crm-lime)" }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Description & Notes">
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--crm-text-dim)" }}>
            {project.description || "No description."}
          </p>
          {project.notes && (
            <p className="text-sm mt-3 pt-3 border-t whitespace-pre-wrap" style={{ borderColor: "var(--crm-border)", color: "var(--crm-text-faint)" }}>
              {project.notes}
            </p>
          )}
          <p className="text-xs mt-3" style={{ color: "var(--crm-text-faint)" }}>
            Assigned: {project.assignees.map((a) => a.user.name).join(", ") || "Unassigned"}
          </p>
        </Panel>

        <Panel title="Milestones">
          <form action={addMilestoneAction.bind(null, project.id)} className="flex gap-2 mb-3">
            <input name="title" placeholder="Milestone" required className="crm-input" />
            <input name="dueDate" type="date" className="crm-input w-auto" />
            <button className="crm-btn crm-btn-ghost">Add</button>
          </form>
          {project.milestones.length === 0 ? (
            <EmptyState message="No milestones." />
          ) : (
            <ul className="space-y-2">
              {project.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <form action={toggleMilestoneAction.bind(null, project.id, m.id, !m.done)}>
                    <button className="flex items-center gap-2 text-sm text-left" style={{ color: m.done ? "var(--crm-green)" : "var(--crm-text)" }}>
                      <span
                        className="h-4 w-4 rounded border flex items-center justify-center shrink-0"
                        style={{ borderColor: m.done ? "var(--crm-green)" : "var(--crm-border-strong)" }}
                      >
                        {m.done && <Check size={11} />}
                      </span>
                      {m.title}
                    </button>
                  </form>
                  <span className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {formatUKDate(m.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tasks">
          {project.tasks.length === 0 ? (
            <EmptyState message="No tasks linked to this project." />
          ) : (
            <ul className="space-y-2">
              {project.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{t.title}</span>
                  <Badge status={t.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href={`/crm/tasks?project=${project.id}`} className="text-xs block mt-3" style={{ color: "var(--crm-cyan)" }}>
            Manage tasks →
          </Link>
        </Panel>

        <Panel title="Documents">
          {project.documents.length === 0 ? (
            <EmptyState message="No files attached." />
          ) : (
            <ul className="space-y-2">
              {project.documents.map((d) => (
                <li key={d.id} className="text-sm">
                  {d.name}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
