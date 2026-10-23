import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, EmptyState } from "@/components/crm/ui";
import { createPersonAction } from "@/lib/actions/people-actions";

export default async function PeoplePage() {
  const people = await prisma.user.findMany({
    include: {
      partner: true,
      assignedProjects: { where: { project: { status: { not: "COMPLETED" } } }, include: { project: true } },
      assignedTasks: { where: { status: { not: "COMPLETED" } } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Add Team Member</p>
        <form action={createPersonAction} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Name" required className="crm-input w-auto flex-1 min-w-32" />
          <input name="email" type="email" placeholder="Email" required className="crm-input w-auto flex-1 min-w-48" />
          <input name="jobTitle" placeholder="Role / job title" className="crm-input w-auto" />
          <input name="phone" placeholder="Phone" className="crm-input w-auto" />
          <button type="submit" className="crm-btn crm-btn-primary">
            <Plus size={13} /> Add
          </button>
        </form>
      </div>

      {people.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No team members yet." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {people.map((p) => (
            <Link
              key={p.id}
              href={p.partner ? `/crm/partners/${p.partner.id}` : `/crm/people/${p.id}`}
              className="crm-panel p-4 flex flex-col gap-2 hover:border-[var(--crm-cyan)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold truncate" style={{ color: "var(--crm-cyan)" }}>
                  {p.name}
                </p>
                <Badge status={p.availability} />
              </div>
              <p className="text-xs truncate" style={{ color: "var(--crm-text-dim)" }}>
                {p.jobTitle ?? p.role} {p.partner ? "· Partner" : ""}
              </p>
              <div className="flex items-center justify-between text-xs mt-1" style={{ color: "var(--crm-text-faint)" }}>
                <span>{p.assignedProjects.length} active projects</span>
                <span>{p.assignedTasks.length} open tasks</span>
              </div>
              {!p.active && <Badge status="INACTIVE" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
