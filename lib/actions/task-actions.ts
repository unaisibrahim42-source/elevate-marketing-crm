"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";

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

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const title = str(formData, "title");
  if (!title) return;

  const task = await prisma.task.create({
    data: {
      title,
      description: str(formData, "description"),
      dueDate: dateVal(formData, "dueDate"),
      priority: str(formData, "priority") ?? "MEDIUM",
      category: str(formData, "category") ?? "CLIENT",
      assigneeId: str(formData, "assigneeId"),
      createdById: user.id,
      clientId: str(formData, "clientId"),
      projectId: str(formData, "projectId"),
      partnerId: str(formData, "partnerId"),
    },
  });

  if (task.assigneeId && task.assigneeId !== user.id) {
    await notify({
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: `New task: ${task.title}`,
      body: `Assigned by ${user.name}`,
      relatedEntityType: "Task",
      relatedEntityId: task.id,
    });
  }

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    clientId: task.clientId,
    description: `${user.name} created task "${task.title}"`,
  });

  revalidatePath("/crm/tasks");
  revalidatePath("/crm/overview");
  if (task.clientId) revalidatePath(`/crm/clients/${task.clientId}/tasks`);
  if (task.partnerId) revalidatePath(`/crm/partners/${task.partnerId}`);
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const user = await requireUser();
  const title = str(formData, "title");
  if (!title) return;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: str(formData, "description"),
      dueDate: dateVal(formData, "dueDate"),
      priority: str(formData, "priority") ?? "MEDIUM",
      category: str(formData, "category") ?? "CLIENT",
      assigneeId: str(formData, "assigneeId"),
      clientId: str(formData, "clientId"),
      projectId: str(formData, "projectId"),
      partnerId: str(formData, "partnerId"),
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "Task",
    entityId: task.id,
    clientId: task.clientId,
    description: `${user.name} updated task "${task.title}"`,
  });

  revalidatePath("/crm/tasks");
  if (task.clientId) revalidatePath(`/crm/clients/${task.clientId}/tasks`);
}

export async function setTaskStatusAction(taskId: string, status: string) {
  const user = await requireUser();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });

  await logActivity({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Task",
    entityId: task.id,
    clientId: task.clientId,
    description: `${user.name} marked task "${task.title}" as ${status.replace("_", " ").toLowerCase()}`,
  });

  revalidatePath("/crm/tasks");
  revalidatePath("/crm/overview");
  if (task.clientId) revalidatePath(`/crm/clients/${task.clientId}/tasks`);
  if (task.partnerId) revalidatePath(`/crm/partners/${task.partnerId}`);
}

export async function deleteTaskAction(taskId: string) {
  await requireUser();
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/crm/tasks");
  if (task.clientId) revalidatePath(`/crm/clients/${task.clientId}/tasks`);
}
