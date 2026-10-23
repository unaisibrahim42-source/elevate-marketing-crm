import { prisma } from "@/lib/db";
import { createInvoiceAction, uploadInvoiceForOcrAction, runOcrForDocumentAction } from "@/lib/actions/invoice-actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string; client?: string }>;
}) {
  const { doc: docId, client } = await searchParams;

  const [clients, projects, doc, ocr] = await Promise.all([
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
    prisma.project.findMany({ select: { id: true, title: true, clientId: true } }),
    docId ? prisma.document.findUnique({ where: { id: docId } }) : null,
    docId ? runOcrForDocumentAction(docId) : null,
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="crm-heading text-lg">New Invoice</h2>

      {!doc && (
        <div className="crm-panel p-4">
          <p className="crm-label mb-2">Upload & Scan (optional)</p>
          <p className="text-xs mb-3" style={{ color: "var(--crm-text-faint)" }}>
            Upload a photo or scan of an invoice (JPG/PNG) and we&apos;ll try to read the amount, date and
            invoice number automatically — you&apos;ll confirm everything before it&apos;s saved. PDFs can be
            uploaded but aren&apos;t scanned yet; enter their details manually below.
          </p>
          <form action={uploadInvoiceForOcrAction} className="flex flex-wrap gap-2 items-center">
            <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required className="crm-input w-auto" />
            <select name="clientId" defaultValue={client ?? ""} className="crm-input crm-select w-auto">
              <option value="">Client (optional at this step)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
            <button type="submit" className="crm-btn crm-btn-ghost">
              Upload & Scan
            </button>
          </form>
        </div>
      )}

      {doc && (
        <div className="crm-panel p-4">
          <p className="crm-label mb-2">
            Scanned: {doc.name} {ocr ? `(${Math.round(ocr.confidence)}% confidence)` : ""}
          </p>
          {!ocr && (
            <p className="text-xs" style={{ color: "var(--crm-amber)" }}>
              Couldn&apos;t run OCR on this file (only JPG/PNG images are scanned). Enter details manually below —
              the file is still attached to this invoice.
            </p>
          )}
          {ocr && (
            <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              Values below are pre-filled from the scan — check them carefully before saving.
            </p>
          )}
        </div>
      )}

      <form action={createInvoiceAction} className="crm-panel p-4 space-y-4">
        {doc && <input type="hidden" name="fileDocumentId" value={doc.id} />}
        {ocr && <input type="hidden" name="ocrExtracted" value="on" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="crm-label block mb-1.5">Client</label>
            <select name="clientId" defaultValue={doc?.clientId ?? client ?? ""} required className="crm-input crm-select">
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Project (optional)</label>
            <select name="projectId" defaultValue="" className="crm-input crm-select">
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Invoice number</label>
            <input name="number" defaultValue={ocr?.guessedInvoiceNumber ?? ""} placeholder="Auto-generated if blank" className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Issue date</label>
            <input name="issueDate" type="date" defaultValue={ocr?.guessedDate ?? new Date().toISOString().slice(0, 10)} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Due date</label>
            <input name="dueDate" type="date" className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Amount (£, excl. VAT)</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={ocr?.guessedAmount != null ? (ocr.guessedAmount / 100).toFixed(2) : ""}
              required
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label block mb-1.5">VAT (£)</label>
            <input name="vat" type="number" step="0.01" defaultValue="0" className="crm-input" />
          </div>
        </div>

        <div>
          <label className="crm-label block mb-1.5">Description</label>
          <textarea name="description" rows={2} className="crm-input resize-none" />
        </div>

        <button type="submit" className="crm-btn crm-btn-primary px-6 py-2.5">
          Save Invoice
        </button>
      </form>
    </div>
  );
}
