import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/crm/ui";
import { createClientContactAction, deleteClientContactAction } from "@/lib/actions/client-actions";

export default async function ClientContactsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contacts = await prisma.clientContact.findMany({ where: { clientId: id }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="space-y-4">
      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Add Contact</p>
        <form action={createClientContactAction.bind(null, id)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input name="name" placeholder="Name" required className="crm-input" />
          <input name="jobTitle" placeholder="Job title" className="crm-input" />
          <input name="email" type="email" placeholder="Email" className="crm-input" />
          <input name="phone" placeholder="Phone" className="crm-input" />
          <textarea name="notes" placeholder="Notes" className="crm-input resize-none sm:col-span-2" rows={2} />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--crm-text-dim)" }}>
            <input type="checkbox" name="isPrimary" /> Primary contact
          </label>
          <button type="submit" className="crm-btn crm-btn-primary sm:col-start-2 justify-self-end">
            Add Contact
          </button>
        </form>
      </div>

      <div className="crm-panel divide-y" style={{ borderColor: "var(--crm-border)" }}>
        {contacts.length === 0 ? (
          <EmptyState message="No additional contacts." />
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="p-3.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {c.name} {c.isPrimary && <span className="crm-badge crm-badge-cyan ml-1.5">Primary</span>}
                </p>
                <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                  {[c.jobTitle, c.email, c.phone].filter(Boolean).join(" · ")}
                </p>
                {c.notes && (
                  <p className="text-xs mt-1" style={{ color: "var(--crm-text-dim)" }}>
                    {c.notes}
                  </p>
                )}
              </div>
              <form action={deleteClientContactAction.bind(null, id, c.id)}>
                <button className="crm-btn-ghost crm-btn p-1.5">
                  <Trash2 size={13} />
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
