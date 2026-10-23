import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { recordContractViewAction, signContractAction, declineContractAction } from "@/lib/actions/contract-actions";
import SigningForm from "@/components/crm/SigningForm";

export default async function SignContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contract = await prisma.contract.findUnique({
    where: { signingToken: token },
    include: { client: true, signatories: true },
  });

  if (!contract) notFound();

  await recordContractViewAction(token);

  const onSign = signContractAction.bind(null, token);
  const onDecline = declineContractAction.bind(null, token);

  const closed = ["TERMINATED", "EXPIRED"].includes(contract.status);

  return (
    <div className="crm-root min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-center">
          <Image src="/logo-white.png" alt="Elevate Marketing" width={140} height={88} className="h-16 w-auto" />
        </div>

        <div className="crm-panel-raised p-6">
          <p className="crm-label mb-1">{contract.client.businessName}</p>
          <h1 className="crm-heading text-xl" style={{ color: "var(--crm-cyan)" }}>
            {contract.name}
          </h1>
          <div className="flex gap-4 text-xs mt-2" style={{ color: "var(--crm-text-faint)" }}>
            {contract.valuePence != null && <span>{formatPence(contract.valuePence)}</span>}
            <span>
              {formatUKDate(contract.startDate)} → {formatUKDate(contract.endDate)}
            </span>
          </div>

          {contract.bodyMarkdown && (
            <pre className="whitespace-pre-wrap text-sm font-sans mt-5 pt-5 border-t" style={{ borderColor: "var(--crm-border)", color: "var(--crm-text-dim)", maxHeight: 360, overflowY: "auto" }}>
              {contract.bodyMarkdown}
            </pre>
          )}
        </div>

        <div className="crm-panel p-6">
          {closed ? (
            <p className="text-sm" style={{ color: "var(--crm-red)" }}>
              This contract is {contract.status.toLowerCase()} and can no longer be signed.
            </p>
          ) : (
            <SigningForm signatories={contract.signatories} onSign={onSign} onDecline={onDecline} />
          )}
        </div>

        <p className="text-center text-xs" style={{ color: "var(--crm-text-faint)" }}>
          Secure signing link — do not share.
        </p>
      </div>
    </div>
  );
}
