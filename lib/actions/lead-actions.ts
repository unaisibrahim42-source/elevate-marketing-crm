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
function penceVal(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function buildLeadData(formData: FormData) {
  return {
    companyName: str(formData, "companyName") ?? "Untitled Lead",
    contactName: str(formData, "contactName"),
    source: str(formData, "source"),
    stage: str(formData, "stage") ?? "NEW_LEAD",
    estValuePerMonthPence: penceVal(formData, "estValuePerMonth"),
    startDate: dateVal(formData, "startDate"),
    contractSentDate: dateVal(formData, "contractSentDate"),
    nextFollowUpDate: dateVal(formData, "nextFollowUpDate"),
    ownerId: str(formData, "ownerId"),
    contactNo: str(formData, "contactNo"),
    email: str(formData, "email"),
    otherInfo: str(formData, "otherInfo"),
  };
}

export async function createLeadAction(formData: FormData) {
  const user = await requireUser();
  const lead = await prisma.lead.create({ data: buildLeadData(formData) });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Lead",
    entityId: lead.id,
    description: `${user.name} added lead "${lead.companyName}"`,
  });

  revalidatePath("/crm/leads");
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const user = await requireUser();
  const lead = await prisma.lead.update({ where: { id: leadId }, data: buildLeadData(formData) });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "Lead",
    entityId: lead.id,
    description: `${user.name} updated lead "${lead.companyName}"`,
  });

  revalidatePath("/crm/leads");
  redirect("/crm/leads");
}

export async function setLeadStageAction(leadId: string, stage: string) {
  const user = await requireUser();
  const lead = await prisma.lead.update({ where: { id: leadId }, data: { stage } });

  await logActivity({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Lead",
    entityId: lead.id,
    description: `${user.name} moved lead "${lead.companyName}" to ${stage.replace("_", " ").toLowerCase()}`,
  });

  revalidatePath("/crm/leads");
}

export async function deleteLeadAction(leadId: string) {
  const user = await requireUser();
  const lead = await prisma.lead.delete({ where: { id: leadId } }).catch(() => null);
  if (lead) {
    await logActivity({
      userId: user.id,
      action: "DELETE",
      entityType: "Lead",
      entityId: leadId,
      description: `${user.name} removed lead "${lead.companyName}"`,
    });
  }
  revalidatePath("/crm/leads");
}
