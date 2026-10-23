import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, EmptyState, PriorityDot } from "@/components/crm/ui";
import { formatUKDate, isOverdue } from "@/lib/dates";
import { updatePersonAction, resetPersonPasswordAction } from "@/lib/actions/people-actions";

export default async function PersonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tempPassword?: string }>;
}) {
  const { id } = await params;
  const { tempPassword } = await searchParams;

  const person = await prisma.user.findUnique({
    where: { id },
    include: {
      assignedProjects: { include: { project: { include: { client: true } } } },
      assignedTasks: { include: { client: true }, orderBy: { dueDate: "asc" } },
    },
  });

  if (!person) notFound();

  const openTasks = person.assignedTasks.filter((t) => t.status !== "COMPLETED");
  const activeProjects = person.assignedProjects.filter((a) => a.project.status !== "COMPLETED");

  const updateAction = updatePersonAction.bind(null, person.id);

  return (
    <div className="space-y-5">
      {tempPassword && (
        <div className="crm-panel p-3 crm-glow-lime">
          <p className="text-sm" style={{ color: "var(--crm-lime)" }}>
            Temporary password: <code className="font-mono">{tempPassword}</code>
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--crm-text-faint)" }}>
            Share this securely — it won&apos;t be shown again.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Profile">
          <form action={updateAction} className="space-y-3">
            <div>
              <label className="crm-label block mb-1.5">Name</label>
              <input name="name" defaultValue={person.name} className="crm-input" />
            </div>
            <div>
              <label className="crm-label block mb-1.5">Job title</label>
              <input name="jobTitle" defaultValue={person.jobTitle ?? ""} className="crm-input" />
            </div>
            <div>
              <label className="crm-label block mb-1.5">Phone</label>
              <input name="phone" defaultValue={person.phone ?? ""} className="crm-input" />
            </div>
            <div>
              <label className="crm-label block mb-1.5">Availability</label>
              <select name="availability" defaultValue={person.availability} className="crm-input crm-select">
                {["AVAILABLE", "LIMITED", "UNAVAILABLE"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="crm-label block mb-1.5">Notes</label>
              <textarea name="notes" defaultValue={person.notes ?? ""} rows={3} className="crm-input resize-none" />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--crm-text-dim)" }}>
              <input type="checkbox" name="active" defaultChecked={person.active} /> Active
            </label>
            <button type="submit" className="crm-btn crm-btn-primary w-full justify-center">
              Save
            </button>
          </form>
          <form action={resetPersonPasswordAction.bind(null, person.id)} className="mt-3">
            <button className="crm-btn crm-btn-ghost w-full justify-center">
              <KeyRound size={13} /> Reset Password
            </button>
          </form>
        </Panel>

        <Panel title="Assigned Projects" className="lg:col-span-2">
          {activeProjects.length === 0 ? (
            <EmptyState message="No active project assignments." />
          ) : (
            <ul className="space-y-2">
              {activeProjects.map((a) => (
                <li key={a.id} className="text-sm flex justify-between">
                  <span>{a.project.title}</span>
                  <span style={{ color: "var(--crm-text-faint)" }}>{a.project.client.businessName}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Open Tasks" className="lg:col-span-3">
          {openTasks.length === 0 ? (
            <EmptyState message="No open tasks." />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--crm-border)" }}>
              {openTasks.map((t) => (
                <li key={t.id} className="py-2.5 flex items-center gap-3">
                  <PriorityDot priority={t.priority} />
                  <span className="text-sm flex-1 truncate">{t.title}</span>
                  <span className="text-xs" style={{ color: isOverdue(t.dueDate) ? "var(--crm-red)" : "var(--crm-text-faint)" }}>
                    {formatUKDate(t.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
