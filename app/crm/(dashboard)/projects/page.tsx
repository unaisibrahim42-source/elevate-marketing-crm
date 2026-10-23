import Link from "next/link";
import { Plus, LayoutList, Kanban } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatUKDate, isOverdue } from "@/lib/dates";
import { setProjectStatusAction } from "@/lib/actions/project-actions";

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "AWAITING_CLIENT", "BLOCKED", "COMPLETED"];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; client?: string; status?: string; priority?: string; assignee?: string }>;
}) {
  const { view = "list", client, status, priority, assignee } = await searchParams;

  const [projects, clients, teamMembers] = await Promise.all([
    prisma.project.findMany({
      where: {
        ...(client ? { clientId: client } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assignee ? { assignees: { some: { userId: assignee } } } : {}),
      },
      include: { client: true, assignees: { include: { user: true } }, tasks: { where: { status: { not: "COMPLETED" } } } },
      orderBy: { deadline: "asc" },
    }),
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view, client, status, priority, assignee, ...overrides };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link href={qs({ view: "list" })} className={`crm-btn ${view !== "kanban" ? "crm-btn-primary" : "crm-btn-ghost"}`}>
            <LayoutList size={14} /> List
          </Link>
          <Link href={qs({ view: "kanban" })} className={`crm-btn ${view === "kanban" ? "crm-btn-primary" : "crm-btn-ghost"}`}>
            <Kanban size={14} /> Kanban
          </Link>
        </div>
        <Link href="/crm/projects/new" className="crm-btn crm-btn-primary">
          <Plus size={14} /> New Project
        </Link>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input type="hidden" name="view" value={view} />
        <select name="client" defaultValue={client ?? ""} className="crm-input crm-select w-auto text-xs py-1.5">
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="crm-input crm-select w-auto text-xs py-1.5">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
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
        <select name="assignee" defaultValue={assignee ?? ""} className="crm-input crm-select w-auto text-xs py-1.5">
          <option value="">Anyone</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button type="submit" className="crm-btn crm-btn-ghost text-xs">
          Filter
        </button>
      </form>

      {projects.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No projects match these filters." />
        </div>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {STATUSES.map((col) => (
            <div key={col} className="crm-panel p-3 min-h-40">
              <p className="crm-label mb-3">{col.replace("_", " ")}</p>
              <div className="space-y-2">
                {projects
                  .filter((p) => p.status === col)
                  .map((p) => (
                    <div key={p.id} className="crm-panel-raised p-3 space-y-1.5">
                      <Link href={`/crm/projects/${p.id}`} className="text-sm font-medium hover:underline block truncate" style={{ color: "var(--crm-text)" }}>
                        {p.title}
                      </Link>
                      <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                        {p.client.businessName}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: isOverdue(p.deadline) ? "var(--crm-red)" : "var(--crm-text-faint)" }}>
                          {formatUKDate(p.deadline)}
                        </span>
                        <PriorityDot priority={p.priority} />
                      </div>
                      <MoveButtons projectId={p.id} current={p.status} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="crm-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--crm-border)" }}>
                <Th>Project</Th>
                <Th>Client</Th>
                <Th>Deadline</Th>
                <Th>Assigned</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Open Tasks</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: "var(--crm-border)" }}>
                  <td className="px-3 py-2.5">
                    <Link href={`/crm/projects/${p.id}`} className="hover:underline font-medium">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{p.client.businessName}</td>
                  <td className="px-3 py-2.5" style={{ color: isOverdue(p.deadline) ? "var(--crm-red)" : undefined }}>
                    {formatUKDate(p.deadline)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{p.assignees.map((a) => a.user.name).join(", ") || "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge status={p.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <PriorityDot priority={p.priority} /> {p.priority}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{p.tasks.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

function MoveButtons({ projectId, current }: { projectId: string; current: string }) {
  const idx = STATUSES.indexOf(current);
  const prev = idx > 0 ? STATUSES[idx - 1] : null;
  const next = idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  return (
    <div className="flex gap-1.5 pt-1">
      {prev && (
        <form action={setProjectStatusAction.bind(null, projectId, prev)}>
          <button className="crm-btn crm-btn-ghost text-[10px] px-2 py-1">← {prev.split("_")[0]}</button>
        </form>
      )}
      {next && (
        <form action={setProjectStatusAction.bind(null, projectId, next)}>
          <button className="crm-btn crm-btn-ghost text-[10px] px-2 py-1">{next.split("_")[0]} →</button>
        </form>
      )}
    </div>
  );
}
