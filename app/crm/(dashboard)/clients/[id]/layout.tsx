import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, ArchiveRestore } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/crm/ui";
import { deriveContractStatus } from "@/lib/contracts";
import { archiveClientAction } from "@/lib/actions/client-actions";
import ClientTabs from "@/components/crm/ClientTabs";

export default async function ClientWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { contracts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!client) notFound();

  const latestContract = client.contracts[0];
  const contractDisplay = latestContract ? deriveContractStatus(latestContract).effectiveStatus : null;
  const archived = client.status === "ARCHIVED";
  const archiveWithId = archiveClientAction.bind(null, client.id, !archived);

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4 lg:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="crm-label mb-1">Client</p>
            <h1 className="crm-heading text-2xl" style={{ color: "var(--crm-cyan)" }}>
              {client.businessName}
            </h1>
            {client.mainContactName && (
              <p className="text-sm mt-1" style={{ color: "var(--crm-text-dim)" }}>
                {client.mainContactName} {client.phone ? `· ${client.phone}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={client.status} />
            {contractDisplay && <Badge status={contractDisplay} />}
            <Link href={`/crm/clients/${client.id}/edit`} className="crm-btn crm-btn-ghost">
              <Pencil size={13} /> Edit
            </Link>
            <form action={archiveWithId}>
              <button type="submit" className="crm-btn crm-btn-ghost">
                {archived ? (
                  <>
                    <ArchiveRestore size={13} /> Restore
                  </>
                ) : (
                  <>
                    <Archive size={13} /> Archive
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <ClientTabs clientId={client.id} />
      </div>

      {children}
    </div>
  );
}
