"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { poundsToPence } from "@/lib/money";

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
  return Number.isFinite(n) ? poundsToPence(n) : null;
}

function buildClientData(formData: FormData) {
  const socials = {
    instagram: str(formData, "social_instagram"),
    linkedin: str(formData, "social_linkedin"),
    tiktok: str(formData, "social_tiktok"),
    facebook: str(formData, "social_facebook"),
  };
  const servicesProvided = str(formData, "servicesProvided");

  return {
    businessName: str(formData, "businessName") ?? "Untitled Client",
    tradingName: str(formData, "tradingName"),
    industry: str(formData, "industry"),
    description: str(formData, "description"),
    address: str(formData, "address"),
    website: str(formData, "website"),
    socials: JSON.stringify(socials),

    mainContactName: str(formData, "mainContactName"),
    jobTitle: str(formData, "jobTitle"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    preferredContact: str(formData, "preferredContact"),
    internalNotes: str(formData, "internalNotes"),

    servicePackage: str(formData, "servicePackage"),
    servicesProvided: servicesProvided ? JSON.stringify(servicesProvided.split(",").map((s) => s.trim()).filter(Boolean)) : null,
    monthlyRetainerPence: penceVal(formData, "monthlyRetainer"),
    oneOffFeesPence: penceVal(formData, "oneOffFees"),
    billingFrequency: str(formData, "billingFrequency"),
    contractStart: dateVal(formData, "contractStart"),
    contractEnd: dateVal(formData, "contractEnd"),
    renewalDate: dateVal(formData, "renewalDate"),
    noticePeriodDays: str(formData, "noticePeriodDays") ? Number(str(formData, "noticePeriodDays")) : null,
    contractStatus: str(formData, "contractStatus") ?? "DRAFT",
    assignedTeamMemberId: str(formData, "assignedTeamMemberId"),

    onboardingDate: dateVal(formData, "onboardingDate"),
    status: str(formData, "status") ?? "ONBOARDING",
    objectives: str(formData, "objectives"),
    priorities: str(formData, "priorities"),
    nextReviewDate: dateVal(formData, "nextReviewDate"),
  };
}

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const data = buildClientData(formData);

  const client = await prisma.client.create({ data });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    clientId: client.id,
    description: `${user.name} added client "${client.businessName}"`,
  });

  revalidatePath("/crm/clients");
  revalidatePath("/crm/overview");
  redirect(`/crm/clients/${client.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const user = await requireUser();
  const data = buildClientData(formData);

  const client = await prisma.client.update({ where: { id: clientId }, data });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "Client",
    entityId: client.id,
    clientId: client.id,
    description: `${user.name} updated client "${client.businessName}"`,
  });

  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${clientId}`);
  revalidatePath("/crm/overview");
  redirect(`/crm/clients/${client.id}`);
}

export async function archiveClientAction(clientId: string, archived: boolean) {
  const user = await requireUser();
  const client = await prisma.client.update({
    where: { id: clientId },
    data: { status: archived ? "ARCHIVED" : "ACTIVE" },
  });

  await logActivity({
    userId: user.id,
    action: archived ? "ARCHIVE" : "RESTORE",
    entityType: "Client",
    entityId: client.id,
    clientId: client.id,
    description: `${user.name} ${archived ? "archived" : "restored"} client "${client.businessName}"`,
  });

  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${clientId}`);
}

export async function createClientContactAction(clientId: string, formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) return;

  await prisma.clientContact.create({
    data: {
      clientId,
      name,
      jobTitle: str(formData, "jobTitle"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
      isPrimary: formData.get("isPrimary") === "on",
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "ClientContact",
    clientId,
    description: `${user.name} added contact "${name}"`,
  });

  revalidatePath(`/crm/clients/${clientId}/contacts`);
}

export async function deleteClientContactAction(clientId: string, contactId: string) {
  await requireUser();
  await prisma.clientContact.delete({ where: { id: contactId } });
  revalidatePath(`/crm/clients/${clientId}/contacts`);
}

export async function addClientNoteAction(clientId: string, formData: FormData) {
  const user = await requireUser();
  const note = str(formData, "note");
  if (!note) return;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;

  await logActivity({
    userId: user.id,
    action: "NOTE",
    entityType: "Client",
    entityId: clientId,
    clientId,
    description: note,
  });

  revalidatePath(`/crm/clients/${clientId}/notes`);
  revalidatePath(`/crm/clients/${clientId}`);
}
