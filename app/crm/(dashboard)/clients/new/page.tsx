import { prisma } from "@/lib/db";
import { createClientAction } from "@/lib/actions/client-actions";
import ClientForm from "@/components/crm/ClientForm";

export default async function NewClientPage() {
  const teamMembers = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } });

  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="crm-heading text-lg" style={{ color: "var(--crm-text)" }}>
        Add Client
      </h2>
      <ClientForm action={createClientAction} teamMembers={teamMembers} submitLabel="Create Client" />
    </div>
  );
}
