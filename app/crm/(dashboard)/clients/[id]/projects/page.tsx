import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatUKDate, isOverdue } from "@/lib/dates";

export default async function ClientProjectsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projects = await prisma.project.findMany({
    where: { clientId: id },
    include: { assignees: { include: { user: true } }, tasks: { where: { status: { not: "COMPLETED" } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="crm-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--crm-border)" }}>
        <h2 className="crm-label" style={{ color: "var(--crm-cyan)" }}>
          Projects
        </h2>
        <Link href={`/crm/projects/new?client=${id}`} className="crm-btn crm-btn-primary text-xs">
          <Plus size={13} /> New Project
        </Link>
      </div>
      <div className="p-4">
        {projects.length === 0 ? (
          <EmptyState message="No projects for this client yet." />
        ) : (
          <ul className="space-y-2.5">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/crm/projects/${p.id}`}
                  className="crm-panel-raised p-3 flex items-center justify-between gap-3 hover:border-[var(--crm-cyan)] transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <PriorityDot priority={p.priority} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                        {p.assignees.map((a) => a.user.name).join(", ") || "Unassigned"} · {p.tasks.length} open tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs" style={{ color: isOverdue(p.deadline) ? "var(--crm-red)" : "var(--crm-text-faint)" }}>
                      {formatUKDate(p.deadline)}
                    </span>
                    <Badge status={p.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
