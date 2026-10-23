"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function dateVal(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  if (!clientId) return;

  const assigneeIds = formData.getAll("assignees").map(String).filter(Boolean);

  const project = await prisma.project.create({
    data: {
      clientId,
      title: str(formData, "title") ?? "Untitled Project",
      description: str(formData, "description"),
      serviceCategory: str(formData, "serviceCategory"),
      startDate: dateVal(formData, "startDate"),
      deadline: dateVal(formData, "deadline"),
      status: str(formData, "status") ?? "NOT_STARTED",
      priority: str(formData, "priority") ?? "MEDIUM",
      notes: str(formData, "notes"),
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
    include: { client: true },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    clientId,
    description: `${user.name} created project "${project.title}" for ${project.client.businessName}`,
  });

  revalidatePath("/crm/projects");
  revalidatePath(`/crm/clients/${clientId}/projects`);
  revalidatePath("/crm/overview");
  redirect(`/crm/projects/${project.id}`);
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  const assigneeIds = formData.getAll("assignees").map(String).filter(Boolean);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      title: str(formData, "title") ?? "Untitled Project",
      description: str(formData, "description"),
      serviceCategory: str(formData, "serviceCategory"),
      startDate: dateVal(formData, "startDate"),
      deadline: dateVal(formData, "deadline"),
      status: str(formData, "status") ?? "NOT_STARTED",
      priority: str(formData, "priority") ?? "MEDIUM",
      progressPct: Number(str(formData, "progressPct") ?? "0"),
      notes: str(formData, "notes"),
      assignees: { deleteMany: {}, create: assigneeIds.map((userId) => ({ userId })) },
    },
    include: { client: true },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "Project",
    entityId: project.id,
    clientId: project.clientId,
    description: `${user.name} updated project "${project.title}"`,
  });

  revalidatePath("/crm/projects");
  revalidatePath(`/crm/projects/${projectId}`);
  revalidatePath(`/crm/clients/${project.clientId}/projects`);
  redirect(`/crm/projects/${projectId}`);
}

export async function setProjectStatusAction(projectId: string, status: string) {
  const user = await requireUser();
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status, progressPct: status === "COMPLETED" ? 100 : undefined },
    include: { client: true },
  });

  await logActivity({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Project",
    entityId: project.id,
    clientId: project.clientId,
    description: `${user.name} marked project "${project.title}" as ${status.replace("_", " ").toLowerCase()}`,
  });

  revalidatePath("/crm/projects");
  revalidatePath(`/crm/clients/${project.clientId}/projects`);
}

export async function addMilestoneAction(projectId: string, formData: FormData) {
  await requireUser();
  const title = str(formData, "title");
  if (!title) return;
  await prisma.milestone.create({
    data: { projectId, title, dueDate: dateVal(formData, "dueDate") },
  });
  revalidatePath(`/crm/projects/${projectId}`);
}

export async function toggleMilestoneAction(projectId: string, milestoneId: string, done: boolean) {
  await requireUser();
  await prisma.milestone.update({ where: { id: milestoneId }, data: { done } });
  revalidatePath(`/crm/projects/${projectId}`);
}
