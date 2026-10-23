"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { calculateProfitSplits } from "@/lib/profit";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function updatePartnerAction(partnerId: string, formData: FormData) {
  const user = await requireUser();
  const partner = await prisma.partner.update({
    where: { id: partnerId },
    data: {
      role: str(formData, "role") ?? "",
      shareholdingPct: Number(str(formData, "shareholdingPct") ?? "0"),
      profitSharePct: Number(str(formData, "profitSharePct") ?? "0"),
      responsibilities: str(formData, "responsibilities"),
      active: formData.get("active") === "on",
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "Partner",
    entityId: partnerId,
    description: `${user.name} updated partner settings for ${partner.name}`,
  });

  revalidatePath("/crm/partners");
  revalidatePath(`/crm/partners/${partnerId}`);
}

export async function createExpenseAction(formData: FormData) {
  const user = await requireUser();
  const description = str(formData, "description");
  const amount = str(formData, "amount");
  if (!description || !amount) return;

  await prisma.expense.create({
    data: {
      description,
      amountPence: Math.round(Number(amount) * 100),
      date: str(formData, "date") ? new Date(str(formData, "date")!) : new Date(),
      category: str(formData, "category"),
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Expense",
    description: `${user.name} logged an expense: "${description}"`,
  });

  revalidatePath("/crm/partners");
}

export async function createAllocationAction(formData: FormData) {
  const user = await requireUser();
  const periodLabel = str(formData, "periodLabel");
  const amount = str(formData, "distributableAmount");
  if (!periodLabel || !amount) return;

  const distributableAmountPence = Math.round(Number(amount) * 100);
  const partners = await prisma.partner.findMany({ where: { active: true } });

  const splits = calculateProfitSplits(
    distributableAmountPence,
    partners.map((p) => ({ partnerId: p.id, pct: p.profitSharePct }))
  );

  const allocation = await prisma.profitAllocation.create({
    data: {
      periodLabel,
      distributableAmountPence,
      splits: { create: splits },
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "ProfitAllocation",
    entityId: allocation.id,
    description: `${user.name} created a profit allocation for ${periodLabel} (£${(distributableAmountPence / 100).toFixed(2)})`,
  });

  revalidatePath("/crm/partners");
}

export async function toggleAllocationPaidAction(allocationId: string, paid: boolean) {
  const user = await requireUser();
  const allocation = await prisma.profitAllocation.update({ where: { id: allocationId }, data: { paid } });
  await logActivity({
    userId: user.id,
    action: paid ? "MARK_PAID" : "MARK_UNPAID",
    entityType: "ProfitAllocation",
    entityId: allocationId,
    description: `${user.name} marked the ${allocation.periodLabel} distribution as ${paid ? "paid" : "unpaid"}`,
  });
  revalidatePath("/crm/partners");
}
