import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { submitOrphanVerification } from "@/services/orphan-verification-service"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const submitSchema = z.object({
  childId: z.string().min(1),
  documentType: z.enum(["death_certificate", "ngo_letter", "other"]),
  documentName: z.string().min(1),
  documentBase64: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = submitSchema.parse(await request.json())
    const verification = await submitOrphanVerification({
      childId: body.childId,
      parentId: session.user.id,
      documentType: body.documentType,
      documentName: body.documentName,
      documentBase64: body.documentBase64,
    })
    return NextResponse.json({ verification })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit verification"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
