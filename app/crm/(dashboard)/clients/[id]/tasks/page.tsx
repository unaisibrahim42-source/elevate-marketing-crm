import { prisma } from "@/lib/db";
import { EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatUKDate, isOverdue } from "@/lib/dates";
import { createTaskAction, setTaskStatusAction } from "@/lib/actions/task-actions";
import InlineStatusSelect from "@/components/crm/InlineStatusSelect";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "AWAITING_CLIENT", "BLOCKED", "COMPLETED"];

export default async function ClientTasksTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tasks, teamMembers, projects] = await Promise.all([
    prisma.task.findMany({ where: { clientId: id }, include: { assignee: true, project: true }, orderBy: { dueDate: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { clientId: id }, select: { id: true, title: true } }),
  ]);

  const createForClient = async (formData: FormData) => {
    "use server";
    formData.set("clientId", id);
    await createTaskAction(formData);
  };

  return (
    <div className="space-y-4">
      <div className="crm-panel p-4">
        <form action={createForClient} className="flex flex-wrap gap-2">
          <input name="title" placeholder="Task title…" required className="crm-input flex-1 min-w-48" />
          <input name="dueDate" type="date" className="crm-input w-auto" />
          <select name="priority" defaultValue="MEDIUM" className="crm-input crm-select w-auto">
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>
                {p}
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
          <select name="projectId" defaultValue="" className="crm-input crm-select w-auto">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button type="submit" className="crm-btn crm-btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="crm-panel divide-y" style={{ borderColor: "var(--crm-border)" }}>
        {tasks.length === 0 ? (
          <EmptyState message="No tasks for this client." />
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="p-3.5 flex items-center gap-3">
              <PriorityDot priority={t.priority} />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{t.title}</p>
                <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                  {[t.project?.title, t.assignee?.name].filter(Boolean).join(" · ") || "Unassigned"}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: isOverdue(t.dueDate) ? "var(--crm-red)" : "var(--crm-text-faint)" }}>
                {formatUKDate(t.dueDate)}
              </span>
              <InlineStatusSelect value={t.status} options={STATUS_OPTIONS} onChange={setTaskStatusAction.bind(null, t.id)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
