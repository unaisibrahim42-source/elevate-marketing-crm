import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveStoredFilePath } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { documentId } = await params;
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  try {
    const buffer = await readFile(resolveStoredFilePath(doc.filePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      },
    });
  } catch {
    return new NextResponse("File missing on disk", { status: 404 });
  }
}
