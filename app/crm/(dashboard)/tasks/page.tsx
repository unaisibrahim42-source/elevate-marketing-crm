import Link from "next/link";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatUKDate, isOverdue, isDueToday } from "@/lib/dates";
import { createTaskAction, setTaskStatusAction, deleteTaskAction } from "@/lib/actions/task-actions";
import InlineStatusSelect from "@/components/crm/InlineStatusSelect";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "AWAITING_CLIENT", "BLOCKED", "COMPLETED"];
const VIEWS = ["all", "today", "upcoming", "overdue", "completed"] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    assignee?: string;
    priority?: string;
    client?: string;
    project?: string;
    category?: string;
  }>;
}) {
  const { view = "all", assignee, priority, client, project, category } = await searchParams;

  const [tasks, clients, projects, teamMembers, partners] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(assignee ? { assigneeId: assignee } : {}),
        ...(priority ? { priority } : {}),
        ...(client ? { clientId: client } : {}),
        ...(project ? { projectId: project } : {}),
        ...(category ? { category } : {}),
      },
      include: { assignee: true, client: true, project: true, partner: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
    prisma.project.findMany({ select: { id: true, title: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.partner.findMany({ select: { id: true, name: true } }),
  ]);

  const filtered = tasks.filter((t) => {
    if (view === "today") return isDueToday(t.dueDate) && t.status !== "COMPLETED";
    if (view === "upcoming") return t.dueDate && !isOverdue(t.dueDate) && !isDueToday(t.dueDate) && t.status !== "COMPLETED";
    if (view === "overdue") return isOverdue(t.dueDate) && t.status !== "COMPLETED";
    if (view === "completed") return t.status === "COMPLETED";
    return t.status !== "COMPLETED";
  });

  const qs = (v: string) => {
    const params = new URLSearchParams();
    if (assignee) params.set("assignee", assignee);
    if (priority) params.set("priority", priority);
    if (client) params.set("client", client);
    if (project) params.set("project", project);
    if (category) params.set("category", category);
    params.set("view", v);
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Quick Add Task</p>
        <form action={createTaskAction} className="flex flex-wrap gap-2">
          <input name="title" placeholder="Task title…" required className="crm-input flex-1 min-w-48" />
          <input name="dueDate" type="date" className="crm-input w-auto" />
          <select name="priority" defaultValue="MEDIUM" className="crm-input crm-select w-auto">
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select name="category" defaultValue="CLIENT" className="crm-input crm-select w-auto">
            {["CLIENT", "INTERNAL", "PARTNER", "ADMIN", "FINANCE", "SALES"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="assigneeId" defaultValue="" className="crm-input crm-select w-auto">
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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
          <select name="projectId" defaultValue="" className="crm-input crm-select w-auto">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select name="partnerId" defaultValue="" className="crm-input crm-select w-auto">
            <option value="">No partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="submit" className="crm-btn crm-btn-primary">
            Add Task
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={qs(v)}
              className="crm-badge"
              style={{
                borderColor: view === v ? "var(--crm-lime)" : "var(--crm-border-strong)",
                color: view === v ? "var(--crm-lime)" : "var(--crm-text-dim)",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Link>
          ))}
        </div>

        <form method="get" className="flex flex-wrap gap-2">
          <input type="hidden" name="view" value={view} />
          <select name="assignee" defaultValue={assignee ?? ""} className="crm-input crm-select w-auto text-xs py-1.5">
            <option value="">Anyone</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={priority ?? ""} className="crm-input crm-select w-auto text-xs py-1.5">
            <option value="">All priorities</option>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select name="client" defaultValue={client ?? ""} className="crm-input crm-select w-auto text-xs py-1.5">
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName}
              </option>
            ))}
          </select>
          <button className="crm-btn crm-btn-ghost text-xs">Filter</button>
        </form>
      </div>

      {filtered.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No tasks here." />
        </div>
      ) : (
        <div className="crm-panel divide-y" style={{ borderColor: "var(--crm-border)" }}>
          {filtered.map((t) => (
            <div key={t.id} className="p-3.5 flex items-center gap-3" style={{ borderColor: "var(--crm-border)" }}>
              <PriorityDot priority={t.priority} />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate" style={{ color: t.status === "COMPLETED" ? "var(--crm-text-faint)" : "var(--crm-text)", textDecoration: t.status === "COMPLETED" ? "line-through" : "none" }}>
                  {t.title}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                  {[t.client?.businessName, t.project?.title, t.partner?.name, t.assignee?.name].filter(Boolean).join(" · ") || "Internal"}
                </p>
              </div>
              <span
                className="text-xs shrink-0"
                style={{ color: isOverdue(t.dueDate) && t.status !== "COMPLETED" ? "var(--crm-red)" : "var(--crm-text-faint)" }}
              >
                {formatUKDate(t.dueDate)}
              </span>
              <InlineStatusSelect value={t.status} options={STATUS_OPTIONS} onChange={setTaskStatusAction.bind(null, t.id)} />
              <form action={deleteTaskAction.bind(null, t.id)}>
                <button className="crm-btn-ghost crm-btn p-1.5" aria-label="Delete task">
                  <Trash2 size={13} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
