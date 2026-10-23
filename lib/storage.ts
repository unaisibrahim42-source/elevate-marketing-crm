import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const STORAGE_ROOT = join(process.cwd(), "storage", "uploads");

export async function saveUploadedFile(file: File): Promise<{ filePath: string; sizeBytes: number; mimeType: string }> {
  await mkdir(STORAGE_ROOT, { recursive: true });
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(STORAGE_ROOT, storedName), buffer);
  return { filePath: storedName, sizeBytes: buffer.byteLength, mimeType: file.type || "application/octet-stream" };
}

export function resolveStoredFilePath(filePath: string): string {
  return join(STORAGE_ROOT, filePath);
}
