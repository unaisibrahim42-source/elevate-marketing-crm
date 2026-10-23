"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createPersonAction(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase();
  if (!name || !email) return;

  const tempPassword = randomBytes(6).toString("base64url");

  const person = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(tempPassword),
      jobTitle: str(formData, "jobTitle"),
      phone: str(formData, "phone"),
      role: "TEAM",
      availability: str(formData, "availability") ?? "AVAILABLE",
      notes: str(formData, "notes"),
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "User",
    entityId: person.id,
    description: `${user.name} added ${person.name} to the team`,
  });

  revalidatePath("/crm/people");
  redirect(`/crm/people/${person.id}?tempPassword=${tempPassword}`);
}

export async function updatePersonAction(personId: string, formData: FormData) {
  const user = await requireUser();
  const person = await prisma.user.update({
    where: { id: personId },
    data: {
      name: str(formData, "name") ?? "",
      jobTitle: str(formData, "jobTitle"),
      phone: str(formData, "phone"),
      availability: str(formData, "availability") ?? "AVAILABLE",
      notes: str(formData, "notes"),
      active: formData.get("active") === "on",
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: personId,
    description: `${user.name} updated ${person.name}'s profile`,
  });

  revalidatePath("/crm/people");
  revalidatePath(`/crm/people/${personId}`);
}

export async function resetPersonPasswordAction(personId: string) {
  await requireUser();
  const tempPassword = randomBytes(6).toString("base64url");
  await prisma.user.update({ where: { id: personId }, data: { passwordHash: hashPassword(tempPassword) } });
  revalidatePath(`/crm/people/${personId}`);
  redirect(`/crm/people/${personId}?tempPassword=${tempPassword}`);
}
