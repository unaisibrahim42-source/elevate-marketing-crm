"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { saveUploadedFile } from "@/lib/storage";
import { sendMail, isEmailConfigured } from "@/lib/mailer";

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

function applyPlaceholders(body: string, vars: Record<string, string>): string {
  let out = body;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export async function createContractTemplateAction(formData: FormData) {
  await requireUser();
  const name = str(formData, "name");
  const bodyMarkdown = str(formData, "bodyMarkdown");
  if (!name || !bodyMarkdown) return;
  await prisma.contractTemplate.create({ data: { name, bodyMarkdown } });
  revalidatePath("/crm/documents");
  revalidatePath("/crm/settings");
}

export async function createContractAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!clientId || !name) return;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;

  const templateId = str(formData, "templateId");
  let bodyMarkdown = str(formData, "bodyMarkdown") ?? "";

  if (templateId && !str(formData, "bodyOverridden")) {
    const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
    if (template) {
      bodyMarkdown = applyPlaceholders(template.bodyMarkdown, {
        client_name: client.mainContactName ?? client.businessName,
        business_name: client.businessName,
        value: str(formData, "value") ?? "",
        start_date: str(formData, "startDate") ?? "",
        end_date: str(formData, "endDate") ?? "",
      });
    }
  }

  let fileDocumentId: string | undefined;
  const uploadedFile = formData.get("file");
  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const saved = await saveUploadedFile(uploadedFile);
    const doc = await prisma.document.create({
      data: {
        name: uploadedFile.name,
        category: "CONTRACT",
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        clientId,
        uploadedById: user.id,
      },
    });
    fileDocumentId = doc.id;
  }

  const signatoryNames = formData.getAll("signatoryName").map(String);
  const signatoryEmails = formData.getAll("signatoryEmail").map(String);

  const contract = await prisma.contract.create({
    data: {
      clientId,
      name,
      templateId: templateId || undefined,
      bodyMarkdown,
      valuePence: str(formData, "value") ? Math.round(Number(str(formData, "value")) * 100) : null,
      startDate: dateVal(formData, "startDate"),
      endDate: dateVal(formData, "endDate"),
      status: "DRAFT",
      fileDocumentId,
      signatories: {
        create: signatoryNames
          .map((n, i) => ({ name: n, email: signatoryEmails[i] ?? "" }))
          .filter((s) => s.name && s.email),
      },
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Contract",
    entityId: contract.id,
    clientId,
    description: `${user.name} drafted contract "${contract.name}" for ${client.businessName}`,
  });

  revalidatePath("/crm/documents");
  revalidatePath(`/crm/clients/${clientId}/documents`);
  redirect(`/crm/documents/contracts/${contract.id}`);
}

export async function sendContractAction(contractId: string) {
  const user = await requireUser();
  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: { status: "SENT", sentAt: new Date() },
    include: { client: true, signatories: true },
  });

  const signingUrl = `/crm/sign/${contract.signingToken}`;
  let emailResult = "not_configured";

  if (isEmailConfigured()) {
    for (const sig of contract.signatories) {
      try {
        await sendMail({
          to: sig.email,
          subject: `${contract.name} — ready for your signature`,
          text: `Hi ${sig.name},\n\n${contract.client.businessName}'s contract "${contract.name}" is ready for signature.\n\nReview and sign: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}${signingUrl}\n\n— Elevate Marketing`,
        });
        emailResult = "sent";
      } catch {
        emailResult = "failed";
      }
    }
  }

  await logActivity({
    userId: user.id,
    action: "SEND",
    entityType: "Contract",
    entityId: contract.id,
    clientId: contract.clientId,
    description: `${user.name} sent contract "${contract.name}" for signature${emailResult === "sent" ? " (emailed)" : emailResult === "failed" ? " (email failed — share link manually)" : " — email not configured, share link manually"}`,
  });

  revalidatePath(`/crm/documents/contracts/${contractId}`);
  revalidatePath("/crm/documents");
  return { signingUrl, emailResult };
}

export async function recordContractViewAction(token: string) {
  const contract = await prisma.contract.findUnique({ where: { signingToken: token } });
  if (!contract) return;
  if (contract.status === "SENT") {
    await prisma.contract.update({ where: { id: contract.id }, data: { status: "VIEWED", viewedAt: new Date() } });
  }
}

export async function signContractAction(token: string, formData: FormData) {
  const contract = await prisma.contract.findUnique({ where: { signingToken: token }, include: { signatories: true, client: true } });
  if (!contract) return { ok: false, error: "Contract not found." };

  const signatoryId = str(formData, "signatoryId");
  const typedSignature = str(formData, "typedSignature");
  const drawnSignature = str(formData, "drawnSignature");
  const consentGiven = formData.get("consent") === "on";

  if (!signatoryId || !typedSignature || !consentGiven) {
    return { ok: false, error: "Full name, signature and consent are all required." };
  }

  await prisma.contractSignatory.update({
    where: { id: signatoryId },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      typedSignature,
      drawnSignature,
      consentGiven: true,
      ipAddress: "recorded-server-side",
    },
  });

  const allSignatories = await prisma.contractSignatory.findMany({ where: { contractId: contract.id } });
  const allSigned = allSignatories.every((s) => s.status === "SIGNED");
  const anySigned = allSignatories.some((s) => s.status === "SIGNED");

  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: allSigned ? "SIGNED" : anySigned ? "PARTIALLY_SIGNED" : contract.status },
  });

  await logActivity({
    action: "SIGN",
    entityType: "Contract",
    entityId: contract.id,
    clientId: contract.clientId,
    description: `${typedSignature} signed contract "${contract.name}"${allSigned ? " — now fully signed" : ""}`,
  });

  if (allSigned) {
    await notify({
      type: "CONTRACT_SIGNED",
      title: `Contract signed: ${contract.name}`,
      body: `${contract.client.businessName} — all signatories have signed.`,
      relatedEntityType: "Contract",
      relatedEntityId: contract.id,
    });
  }

  revalidatePath(`/crm/documents/contracts/${contract.id}`);
  return { ok: true };
}

export async function declineContractAction(token: string, formData: FormData) {
  const contract = await prisma.contract.findUnique({ where: { signingToken: token } });
  if (!contract) return;
  const signatoryId = str(formData, "signatoryId");
  if (signatoryId) {
    await prisma.contractSignatory.update({ where: { id: signatoryId }, data: { status: "DECLINED" } });
  }
  await prisma.contract.update({ where: { id: contract.id }, data: { status: "DECLINED" } });
  await logActivity({
    action: "DECLINE",
    entityType: "Contract",
    entityId: contract.id,
    clientId: contract.clientId,
    description: `Contract "${contract.name}" was declined by the signatory`,
  });
  revalidatePath(`/crm/documents/contracts/${contract.id}`);
}

export async function terminateContractAction(contractId: string) {
  const user = await requireUser();
  const contract = await prisma.contract.update({ where: { id: contractId }, data: { status: "TERMINATED" } });
  await logActivity({
    userId: user.id,
    action: "TERMINATE",
    entityType: "Contract",
    entityId: contract.id,
    clientId: contract.clientId,
    description: `${user.name} terminated contract "${contract.name}"`,
  });
  revalidatePath(`/crm/documents/contracts/${contractId}`);
  revalidatePath("/crm/documents");
}

export async function renewContractAction(contractId: string, formData: FormData) {
  const user = await requireUser();
  const original = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!original) return;

  const renewed = await prisma.contract.create({
    data: {
      clientId: original.clientId,
      name: `${original.name} (Renewal)`,
      bodyMarkdown: original.bodyMarkdown,
      valuePence: original.valuePence,
      startDate: dateVal(formData, "startDate"),
      endDate: dateVal(formData, "endDate"),
      status: "DRAFT",
      renewedFromId: original.id,
      signatories: {
        create: (await prisma.contractSignatory.findMany({ where: { contractId: original.id } })).map((s) => ({
          name: s.name,
          email: s.email,
        })),
      },
    },
  });

  await logActivity({
    userId: user.id,
    action: "RENEW",
    entityType: "Contract",
    entityId: renewed.id,
    clientId: original.clientId,
    description: `${user.name} created renewal "${renewed.name}" from "${original.name}"`,
  });

  revalidatePath("/crm/documents");
  redirect(`/crm/documents/contracts/${renewed.id}`);
}

export async function addSignatoryAction(contractId: string, formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const email = str(formData, "email");
  if (!name || !email) return;
  await prisma.contractSignatory.create({ data: { contractId, name, email } });
  await logActivity({
    userId: user.id,
    action: "ADD_SIGNATORY",
    entityType: "Contract",
    entityId: contractId,
    description: `${user.name} added signatory ${name}`,
  });
  revalidatePath(`/crm/documents/contracts/${contractId}`);
}

export async function markContractReadyAction(contractId: string) {
  const user = await requireUser();
  await prisma.contract.update({ where: { id: contractId }, data: { status: "READY" } });
  await logActivity({ userId: user.id, action: "STATUS_CHANGE", entityType: "Contract", entityId: contractId, description: `${user.name} marked a contract as ready to send` });
  revalidatePath(`/crm/documents/contracts/${contractId}`);
}
