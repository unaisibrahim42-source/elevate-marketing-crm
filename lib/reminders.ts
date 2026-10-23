import { prisma } from "@/lib/db";
import { outstandingForInvoice } from "@/lib/finance";

const DEDUPE_WINDOW_HOURS = 20;

async function alreadyNotifiedRecently(type: string, relatedEntityId: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { type, relatedEntityId, createdAt: { gte: since } },
  });
  return !!existing;
}

/**
 * Surfaces time-sensitive reminders (overdue tasks/invoices, contracts
 * nearing expiry or still awaiting signature) as notifications. There's no
 * background worker in this deployment, so this runs cheaply on each
 * dashboard load instead, deduped per entity so it doesn't spam.
 */
export async function generateReminderNotifications() {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: { status: { not: "COMPLETED" }, dueDate: { lt: now } },
  });
  for (const t of overdueTasks) {
    if (await alreadyNotifiedRecently("TASK_OVERDUE", t.id)) continue;
    await prisma.notification.create({
      data: {
        userId: t.assigneeId,
        type: "TASK_OVERDUE",
        title: `Overdue: ${t.title}`,
        body: "This task is past its due date.",
        relatedEntityType: "Task",
        relatedEntityId: t.id,
      },
    });
  }

  const openInvoices = await prisma.invoice.findMany({
    where: { status: { notIn: ["VOID", "DRAFT", "PAID"] } },
    include: { payments: true, client: true },
  });
  for (const inv of openInvoices) {
    if (!inv.dueDate || inv.dueDate >= now) continue;
    if (outstandingForInvoice(inv) <= 0) continue;
    if (await alreadyNotifiedRecently("INVOICE_OVERDUE", inv.id)) continue;
    await prisma.notification.create({
      data: {
        type: "INVOICE_OVERDUE",
        title: `Overdue invoice: ${inv.number}`,
        body: `${inv.client.businessName} — payment is overdue.`,
        relatedEntityType: "Invoice",
        relatedEntityId: inv.id,
      },
    });
  }

  const awaitingSignature = await prisma.contract.findMany({
    where: { status: { in: ["SENT", "VIEWED"] } },
    include: { client: true },
  });
  for (const c of awaitingSignature) {
    if (!c.sentAt) continue;
    const daysSinceSent = (now.getTime() - c.sentAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSent < 3) continue;
    if (await alreadyNotifiedRecently("CONTRACT_AWAITING_SIGNATURE", c.id)) continue;
    await prisma.notification.create({
      data: {
        type: "CONTRACT_AWAITING_SIGNATURE",
        title: `Still awaiting signature: ${c.name}`,
        body: `${c.client.businessName} hasn't signed yet (sent ${Math.floor(daysSinceSent)} days ago).`,
        relatedEntityType: "Contract",
        relatedEntityId: c.id,
      },
    });
  }

  const expiringSoon = await prisma.contract.findMany({
    where: { status: "SIGNED", endDate: { gte: now, lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) } },
    include: { client: true },
  });
  for (const c of expiringSoon) {
    if (await alreadyNotifiedRecently("CONTRACT_EXPIRING", c.id)) continue;
    await prisma.notification.create({
      data: {
        type: "CONTRACT_EXPIRING",
        title: `Contract ending soon: ${c.name}`,
        body: `${c.client.businessName} — ends ${c.endDate?.toLocaleDateString("en-GB")}.`,
        relatedEntityType: "Contract",
        relatedEntityId: c.id,
      },
    });
  }
}
