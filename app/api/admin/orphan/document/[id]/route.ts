import { NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

const storageDir = process.env.ORPHAN_DOC_STORAGE_DIR || path.join(process.cwd(), "storage", "orphan-docs")

function getMimeType(fileName: string) {
  if (fileName.endsWith(".pdf")) return "application/pdf"
  if (fileName.endsWith(".png")) return "image/png"
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    await requireRole("admin")
    const verification = await prisma.orphanVerification.findUnique({ where: { id: context.params.id } })
    if (!verification) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const filePath = path.join(storageDir, verification.documentUrl.replace("orphan-docs/", ""))
    const fileBuffer = await fs.readFile(filePath)
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getMimeType(filePath),
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
