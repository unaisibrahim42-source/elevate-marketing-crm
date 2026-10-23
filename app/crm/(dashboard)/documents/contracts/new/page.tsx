import { prisma } from "@/lib/db";
import { createContractAction, createContractTemplateAction } from "@/lib/actions/contract-actions";

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const [clients, templates] = await Promise.all([
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
    prisma.contractTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="crm-heading text-lg">New Contract</h2>

      <form action={createContractAction} className="crm-panel p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="crm-label block mb-1.5">Client</label>
            <select name="clientId" defaultValue={client ?? ""} required className="crm-input crm-select">
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Contract name</label>
            <input name="name" required className="crm-input" placeholder="e.g. Momentum Package — Retainer" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Value (£)</label>
            <input name="value" type="number" step="0.01" className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Template (optional)</label>
            <select name="templateId" defaultValue="" className="crm-input crm-select">
              <option value="">Blank / upload instead</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Start date</label>
            <input name="startDate" type="date" className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">End date</label>
            <input name="endDate" type="date" className="crm-input" />
          </div>
        </div>

        <div>
          <label className="crm-label block mb-1.5">Contract body (editable — fills from template if selected)</label>
          <textarea name="bodyMarkdown" rows={8} className="crm-input resize-y font-mono text-xs" placeholder="Write or paste the contract text…" />
        </div>

        <div>
          <label className="crm-label block mb-1.5">Or upload an existing signed/unsigned PDF instead</label>
          <input type="file" name="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="crm-input" />
        </div>

        <div>
          <label className="crm-label block mb-2">Signatories</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input name="signatoryName" placeholder="Signatory name" className="crm-input" />
            <input name="signatoryEmail" type="email" placeholder="Signatory email" className="crm-input" />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--crm-text-faint)" }}>
            You can add more signatories after creating the contract.
          </p>
        </div>

        <button type="submit" className="crm-btn crm-btn-primary px-6 py-2.5">
          Create Contract
        </button>
      </form>

      <details className="crm-panel p-4">
        <summary className="crm-label cursor-pointer" style={{ color: "var(--crm-cyan)" }}>
          + Save a new reusable template
        </summary>
        <form action={createContractTemplateAction} className="space-y-3 mt-4">
          <input name="name" placeholder="Template name" required className="crm-input" />
          <textarea
            name="bodyMarkdown"
            required
            rows={6}
            className="crm-input resize-y font-mono text-xs"
            placeholder={"Use {{client_name}}, {{business_name}}, {{value}}, {{start_date}}, {{end_date}} as placeholders…"}
          />
          <button type="submit" className="crm-btn crm-btn-ghost">
            Save Template
          </button>
        </form>
      </details>
    </div>
  );
}
