"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { saveUploadedFile } from "@/lib/storage";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function uploadLibraryFileAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const saved = await saveUploadedFile(file);
  const doc = await prisma.document.create({
    data: {
      name: str(formData, "name") || file.name,
      category: str(formData, "category") || "OTHER",
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      clientId: str(formData, "clientId"),
      projectId: str(formData, "projectId"),
      uploadedById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPLOAD",
    entityType: "Document",
    entityId: doc.id,
    clientId: doc.clientId,
    description: `${user.name} uploaded "${doc.name}"`,
  });

  revalidatePath("/crm/documents");
  if (doc.clientId) revalidatePath(`/crm/clients/${doc.clientId}/documents`);
}

export async function deleteDocumentAction(documentId: string) {
  await requireUser();
  const doc = await prisma.document.delete({ where: { id: documentId } }).catch(() => null);
  revalidatePath("/crm/documents");
  if (doc?.clientId) revalidatePath(`/crm/clients/${doc.clientId}/documents`);
}
