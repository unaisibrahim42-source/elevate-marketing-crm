export type ProjectFormDefaults = {
  clientId?: string;
  title?: string;
  description?: string | null;
  serviceCategory?: string | null;
  startDate?: Date | null;
  deadline?: Date | null;
  status?: string | null;
  priority?: string | null;
  progressPct?: number;
  notes?: string | null;
  assigneeIds?: string[];
};

function toInputDate(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function ProjectForm({
  action,
  defaults = {},
  clients,
  teamMembers,
  lockClient,
  submitLabel = "Save Project",
  showProgress = false,
}: {
  action: (formData: FormData) => void;
  defaults?: ProjectFormDefaults;
  clients: { id: string; businessName: string }[];
  teamMembers: { id: string; name: string }[];
  lockClient?: boolean;
  submitLabel?: string;
  showProgress?: boolean;
}) {
  const assigneeIds = new Set(defaults.assigneeIds ?? []);

  return (
    <form action={action} className="crm-panel p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="crm-label block mb-1.5">Client</label>
          {lockClient ? (
            <>
              <input type="hidden" name="clientId" value={defaults.clientId} />
              <p className="crm-input bg-transparent">{clients.find((c) => c.id === defaults.clientId)?.businessName}</p>
            </>
          ) : (
            <select name="clientId" defaultValue={defaults.clientId ?? ""} required className="crm-input crm-select">
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="crm-label block mb-1.5">Project title</label>
          <input name="title" defaultValue={defaults.title} required className="crm-input" />
        </div>
        <div>
          <label className="crm-label block mb-1.5">Service category</label>
          <input name="serviceCategory" defaultValue={defaults.serviceCategory ?? ""} className="crm-input" placeholder="e.g. Social, SEO, Paid Ads" />
        </div>
        <div>
          <label className="crm-label block mb-1.5">Status</label>
          <select name="status" defaultValue={defaults.status ?? "NOT_STARTED"} className="crm-input crm-select">
            {["NOT_STARTED", "IN_PROGRESS", "AWAITING_CLIENT", "BLOCKED", "COMPLETED", "ARCHIVED"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="crm-label block mb-1.5">Priority</label>
          <select name="priority" defaultValue={defaults.priority ?? "MEDIUM"} className="crm-input crm-select">
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {showProgress && (
          <div>
            <label className="crm-label block mb-1.5">Progress (%)</label>
            <input name="progressPct" type="number" min={0} max={100} defaultValue={defaults.progressPct ?? 0} className="crm-input" />
          </div>
        )}
        <div>
          <label className="crm-label block mb-1.5">Start date</label>
          <input name="startDate" type="date" defaultValue={toInputDate(defaults.startDate)} className="crm-input" />
        </div>
        <div>
          <label className="crm-label block mb-1.5">Deadline</label>
          <input name="deadline" type="date" defaultValue={toInputDate(defaults.deadline)} className="crm-input" />
        </div>
      </div>

      <div>
        <label className="crm-label block mb-1.5">Assigned team members</label>
        <div className="flex flex-wrap gap-3">
          {teamMembers.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--crm-text-dim)" }}>
              <input type="checkbox" name="assignees" value={m.id} defaultChecked={assigneeIds.has(m.id)} />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="crm-label block mb-1.5">Description</label>
        <textarea name="description" defaultValue={defaults.description ?? ""} rows={3} className="crm-input resize-none" />
      </div>
      <div>
        <label className="crm-label block mb-1.5">Internal notes</label>
        <textarea name="notes" defaultValue={defaults.notes ?? ""} rows={2} className="crm-input resize-none" />
      </div>

      <button type="submit" className="crm-btn crm-btn-primary px-6 py-2.5">
        {submitLabel}
      </button>
    </form>
  );
}
