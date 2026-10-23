"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { saveUploadedFile } from "@/lib/storage";
import { runInvoiceOcr } from "@/lib/ocr";
import { resolveStoredFilePath } from "@/lib/storage";
import { readFile } from "fs/promises";

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
function penceFromPounds(v: string | null): number {
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { number: { startsWith: `INV-${year}-` } } });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function uploadInvoiceForOcrAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const clientId = str(formData, "clientId");
  const saved = await saveUploadedFile(file);
  const doc = await prisma.document.create({
    data: {
      name: file.name,
      category: "INVOICE",
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      clientId,
      uploadedById: user.id,
    },
  });

  redirect(`/crm/documents/invoices/new?doc=${doc.id}${clientId ? `&client=${clientId}` : ""}`);
}

export async function runOcrForDocumentAction(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  try {
    const buffer = await readFile(resolveStoredFilePath(doc.filePath));
    return await runInvoiceOcr(buffer, doc.mimeType || "");
  } catch {
    return null;
  }
}

export async function createInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  if (!clientId) return;

  const amountPence = penceFromPounds(str(formData, "amount"));
  const vatPence = penceFromPounds(str(formData, "vat"));
  const totalPence = amountPence + vatPence;
  const number = str(formData, "number") || (await generateInvoiceNumber());
  const fileDocumentId = str(formData, "fileDocumentId");

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientId,
      projectId: str(formData, "projectId"),
      description: str(formData, "description"),
      issueDate: dateVal(formData, "issueDate") ?? new Date(),
      dueDate: dateVal(formData, "dueDate"),
      amountPence,
      vatPence,
      totalPence,
      status: "UNPAID",
      fileDocumentId: fileDocumentId || undefined,
      ocrExtracted: formData.get("ocrExtracted") === "on",
    },
    include: { client: true },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    clientId,
    description: `${user.name} created invoice ${invoice.number} for ${invoice.client.businessName} (${(totalPence / 100).toFixed(2)})`,
  });

  revalidatePath("/crm/documents");
  revalidatePath("/crm/finance");
  revalidatePath(`/crm/clients/${clientId}/finance`);
  redirect(`/crm/documents/invoices/${invoice.id}`);
}

export async function recordPaymentAction(invoiceId: string, formData: FormData) {
  const user = await requireUser();
  const amountPence = penceFromPounds(str(formData, "amount"));
  if (amountPence <= 0) return;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true, client: true } });
  if (!invoice) return;

  await prisma.payment.create({
    data: {
      invoiceId,
      amountPence,
      paymentDate: dateVal(formData, "paymentDate") ?? new Date(),
      method: str(formData, "method"),
      notes: str(formData, "notes"),
      status: "CONFIRMED",
    },
  });

  const paidSoFar = invoice.payments.filter((p) => p.status === "CONFIRMED").reduce((s, p) => s + p.amountPence, 0) + amountPence;
  const newStatus = paidSoFar >= invoice.totalPence ? "PAID" : "PARTIALLY_PAID";

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });

  await logActivity({
    userId: user.id,
    action: "PAYMENT",
    entityType: "Invoice",
    entityId: invoiceId,
    clientId: invoice.clientId,
    description: `${user.name} recorded a payment of £${(amountPence / 100).toFixed(2)} on invoice ${invoice.number}${newStatus === "PAID" ? " — now fully paid" : ""}`,
  });

  await notify({
    type: "PAYMENT_RECEIVED",
    title: `Payment received: ${invoice.number}`,
    body: `£${(amountPence / 100).toFixed(2)} from ${invoice.client.businessName}`,
    relatedEntityType: "Invoice",
    relatedEntityId: invoiceId,
  });

  revalidatePath(`/crm/documents/invoices/${invoiceId}`);
  revalidatePath("/crm/finance");
  revalidatePath(`/crm/clients/${invoice.clientId}/finance`);
  revalidatePath("/crm/overview");
}

export async function reversePaymentAction(paymentId: string) {
  const user = await requireUser();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
  if (!payment) return;

  await prisma.payment.update({ where: { id: paymentId }, data: { status: "REVERSED" } });

  const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId }, include: { payments: true } });
  if (invoice) {
    const paid = invoice.payments.filter((p) => p.status === "CONFIRMED" && p.id !== paymentId).reduce((s, p) => s + p.amountPence, 0);
    const newStatus = paid <= 0 ? "UNPAID" : paid >= invoice.totalPence ? "PAID" : "PARTIALLY_PAID";
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });
  }

  await logActivity({
    userId: user.id,
    action: "PAYMENT_REVERSED",
    entityType: "Invoice",
    entityId: payment.invoiceId,
    clientId: payment.invoice.clientId,
    description: `${user.name} reversed a payment of £${(payment.amountPence / 100).toFixed(2)} on invoice ${payment.invoice.number}`,
  });

  revalidatePath(`/crm/documents/invoices/${payment.invoiceId}`);
  revalidatePath("/crm/finance");
}

export async function voidInvoiceAction(invoiceId: string) {
  const user = await requireUser();
  const invoice = await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
  await logActivity({
    userId: user.id,
    action: "VOID",
    entityType: "Invoice",
    entityId: invoiceId,
    clientId: invoice.clientId,
    description: `${user.name} voided invoice ${invoice.number}`,
  });
  revalidatePath(`/crm/documents/invoices/${invoiceId}`);
  revalidatePath("/crm/finance");
}

export async function sendInvoiceAction(invoiceId: string) {
  const user = await requireUser();
  const invoice = await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SENT" } });
  await logActivity({
    userId: user.id,
    action: "SEND",
    entityType: "Invoice",
    entityId: invoiceId,
    clientId: invoice.clientId,
    description: `${user.name} marked invoice ${invoice.number} as sent`,
  });
  revalidatePath(`/crm/documents/invoices/${invoiceId}`);
}
