import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, XCircle, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, Badge, EmptyState } from "@/components/crm/ui";
import { formatUKDate, formatUKDateTime } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { deriveContractStatus } from "@/lib/contracts";
import { addSignatoryAction, terminateContractAction, markContractReadyAction, renewContractAction } from "@/lib/actions/contract-actions";
import SendContractButton from "@/components/crm/SendContractButton";
import CopyLinkBox from "@/components/crm/CopyLinkBox";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { client: true, signatories: true, fileDocument: true, signedFileDocument: true },
  });

  if (!contract) notFound();

  const derived = deriveContractStatus(contract);

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/crm/clients/${contract.clientId}`} className="crm-label" style={{ color: "var(--crm-cyan)" }}>
            {contract.client.businessName}
          </Link>
          <h1 className="crm-heading text-xl mt-1">{contract.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge status={derived.effectiveStatus} />
            {derived.notYetActive && (
              <span className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                signed, starts {formatUKDate(contract.startDate)}
              </span>
            )}
            {contract.valuePence != null && (
              <span className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                {formatPence(contract.valuePence)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contract.status === "DRAFT" && (
            <form action={markContractReadyAction.bind(null, contract.id)}>
              <button className="crm-btn crm-btn-ghost">Mark Ready</button>
            </form>
          )}
          {["DRAFT", "READY"].includes(contract.status) && contract.signatories.length > 0 && (
            <SendContractButton contractId={contract.id} />
          )}
          {["SIGNED", "PARTIALLY_SIGNED", "ACTIVE"].includes(derived.effectiveStatus) && contract.status !== "TERMINATED" && (
            <form action={terminateContractAction.bind(null, contract.id)}>
              <button className="crm-btn crm-btn-danger">
                <XCircle size={13} /> Terminate
              </button>
            </form>
          )}
          {["SIGNED", "EXPIRED", "TERMINATED"].includes(contract.status) && (
            <form action={renewContractAction.bind(null, contract.id)} className="flex items-center gap-2">
              <input type="date" name="startDate" className="crm-input w-auto text-xs" required />
              <input type="date" name="endDate" className="crm-input w-auto text-xs" required />
              <button className="crm-btn crm-btn-ghost">
                <RefreshCw size={13} /> Renew
              </button>
            </form>
          )}
          {contract.fileDocumentId && (
            <a href={`/api/crm/files/${contract.fileDocumentId}`} target="_blank" rel="noreferrer" className="crm-btn crm-btn-ghost">
              <Download size={13} /> Original
            </a>
          )}
        </div>
      </div>

      {contract.status !== "DRAFT" && (
        <CopyLinkBox
          path={`/crm/sign/${contract.signingToken}`}
          label="Signing link — share this with the client if email isn't set up, or to resend."
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Contract Body" className="lg:col-span-2">
          {contract.bodyMarkdown ? (
            <pre className="whitespace-pre-wrap text-sm font-sans" style={{ color: "var(--crm-text-dim)" }}>
              {contract.bodyMarkdown}
            </pre>
          ) : (
            <EmptyState message="No text body — see the uploaded file." />
          )}
        </Panel>

        <Panel title="Signatories">
          <ul className="space-y-3">
            {contract.signatories.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>{s.name}</span>
                  <Badge status={s.status} />
                </div>
                <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                  {s.email}
                </p>
                {s.signedAt && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--crm-green)" }}>
                    Signed {formatUKDateTime(s.signedAt)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {contract.signatories.length === 0 && <EmptyState message="No signatories added." />}

          <form action={addSignatoryAction.bind(null, contract.id)} className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "var(--crm-border)" }}>
            <input name="name" placeholder="Name" required className="crm-input" />
            <input name="email" type="email" placeholder="Email" required className="crm-input" />
            <button className="crm-btn crm-btn-ghost w-full justify-center">Add Signatory</button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
