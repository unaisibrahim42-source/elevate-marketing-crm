import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/crm/ui";
import { formatUKDateTime } from "@/lib/dates";
import { addClientNoteAction } from "@/lib/actions/client-actions";

export default async function ClientNotesTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, activity] = await Promise.all([
    prisma.client.findUnique({ where: { id }, select: { internalNotes: true } }),
    prisma.activityLog.findMany({ where: { clientId: id }, include: { user: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-4">
      {client?.internalNotes && (
        <div className="crm-panel p-4">
          <p className="crm-label mb-2">Internal Notes</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--crm-text-dim)" }}>
            {client.internalNotes}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--crm-text-faint)" }}>
            Not visible to the client. Edit via the client&apos;s Edit page.
          </p>
        </div>
      )}

      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Log a Note / Activity</p>
        <form action={addClientNoteAction.bind(null, id)} className="flex gap-2">
          <input name="note" placeholder="What happened?" required className="crm-input flex-1" />
          <button type="submit" className="crm-btn crm-btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="crm-panel">
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--crm-border)" }}>
          <p className="crm-label" style={{ color: "var(--crm-cyan)" }}>
            Activity Timeline
          </p>
        </div>
        <div className="p-4">
          {activity.length === 0 ? (
            <EmptyState message="No activity recorded yet." />
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-sm flex justify-between gap-4 border-b pb-3 last:border-0" style={{ borderColor: "var(--crm-border)" }}>
                  <span>{a.description}</span>
                  <span className="shrink-0 text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {a.user?.name ?? "System"} · {formatUKDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
