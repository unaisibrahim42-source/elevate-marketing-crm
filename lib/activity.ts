import { prisma } from "@/lib/db";

export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  clientId?: string | null;
}) {
  await prisma.activityLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      description: params.description,
      clientId: params.clientId ?? null,
    },
  });
}

export async function notify(params: {
  userId?: string | null;
  type: string;
  title: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId ?? null,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    },
  });
}
