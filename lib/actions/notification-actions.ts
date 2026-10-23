"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { OR: [{ userId: user.id }, { userId: null }], read: false },
    data: { read: true },
  });
  revalidatePath("/crm", "layout");
}

export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/crm", "layout");
}
