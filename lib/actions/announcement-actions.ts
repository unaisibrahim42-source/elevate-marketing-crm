"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function createAnnouncementAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return;

  await prisma.announcement.create({
    data: { title, body, authorId: user.id },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Announcement",
    description: `${user.name} posted an announcement: "${title}"`,
  });

  revalidatePath("/crm/overview");
}

export async function deleteAnnouncementAction(id: string) {
  await requireUser();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/crm/overview");
}
