import { prisma } from "@/lib/db";
import { createProjectAction } from "@/lib/actions/project-actions";
import ProjectForm from "@/components/crm/ProjectForm";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const [clients, teamMembers] = await Promise.all([
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="crm-heading text-lg">New Project</h2>
      <ProjectForm
        action={createProjectAction}
        defaults={{ clientId: client }}
        clients={clients}
        teamMembers={teamMembers}
        lockClient={!!client}
        submitLabel="Create Project"
      />
    </div>
  );
}
