import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateProjectAction } from "@/lib/actions/project-actions";
import ProjectForm from "@/components/crm/ProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, clients, teamMembers] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { assignees: true } }),
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, businessName: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  if (!project) notFound();

  const action = updateProjectAction.bind(null, project.id);

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="crm-heading text-lg">Edit {project.title}</h2>
      <ProjectForm
        action={action}
        defaults={{ ...project, assigneeIds: project.assignees.map((a) => a.userId) }}
        clients={clients}
        teamMembers={teamMembers}
        lockClient
        submitLabel="Save Changes"
        showProgress
      />
    </div>
  );
}
