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
function penceVal(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function ratingVal(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function buildFreelancerData(formData: FormData) {
  return {
    name: str(formData, "name") ?? "Untitled",
    role: str(formData, "role") ?? "Freelancer",
    specialty: str(formData, "specialty"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    rateAmountPence: penceVal(formData, "rateAmount"),
    rateType: str(formData, "rateType"),
    availability: str(formData, "availability") ?? "AVAILABLE",
    location: str(formData, "location"),
    portfolioUrl: str(formData, "portfolioUrl"),
    rating: ratingVal(formData, "rating"),
    notes: str(formData, "notes"),
  };
}

export async function createFreelancerAction(formData: FormData) {
  const user = await requireUser();
  const freelancer = await prisma.freelancer.create({ data: buildFreelancerData(formData) });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Freelancer",
    entityId: freelancer.id,
    description: `${user.name} added ${freelancer.name} (${freelancer.role}) to the freelancer roster`,
  });

  revalidatePath("/crm/freelancers");
}

export async function updateFreelancerAction(freelancerId: string, formData: FormData) {
  const user = await requireUser();
  const freelancer = await prisma.freelancer.update({
    where: { id: freelancerId },
    data: buildFreelancerData(formData),
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "Freelancer",
    entityId: freelancer.id,
    description: `${user.name} updated ${freelancer.name}'s details`,
  });

  revalidatePath("/crm/freelancers");
  redirect("/crm/freelancers");
}

export async function setFreelancerAvailabilityAction(freelancerId: string, availability: string) {
  const user = await requireUser();
  const freelancer = await prisma.freelancer.update({
    where: { id: freelancerId },
    data: { availability },
  });

  await logActivity({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Freelancer",
    entityId: freelancer.id,
    description: `${user.name} marked ${freelancer.name} as ${availability.toLowerCase()}`,
  });

  revalidatePath("/crm/freelancers");
}

export async function deleteFreelancerAction(freelancerId: string) {
  const user = await requireUser();
  const freelancer = await prisma.freelancer.delete({ where: { id: freelancerId } }).catch(() => null);
  if (freelancer) {
    await logActivity({
      userId: user.id,
      action: "DELETE",
      entityType: "Freelancer",
      entityId: freelancerId,
      description: `${user.name} removed ${freelancer.name} from the freelancer roster`,
    });
  }
  revalidatePath("/crm/freelancers");
}
