import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateClientAction } from "@/lib/actions/client-actions";
import ClientForm from "@/components/crm/ClientForm";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, teamMembers] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  if (!client) notFound();

  const action = updateClientAction.bind(null, client.id);

  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="crm-heading text-lg" style={{ color: "var(--crm-text)" }}>
        Edit {client.businessName}
      </h2>
      <ClientForm action={action} defaults={client} teamMembers={teamMembers} submitLabel="Save Changes" />
    </div>
  );
}
