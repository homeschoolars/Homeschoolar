import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - this route makes database calls
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET curriculum plan (stored paths from assessment). Parent view. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)

    const paths = await prisma.curriculumPath.findMany({
      where: { childId: id },
      include: { subject: true },
    })
    paths.sort(
      (a, b) => (a.subject?.displayOrder ?? 0) - (b.subject?.displayOrder ?? 0)
    )

    const plan = paths.map((p) => ({
      subjectId: p.subjectId,
      subjectName: p.subject?.name ?? "General",
      currentTopic: p.currentTopic,
      nextTopics: p.nextTopics ?? [],
      masteryLevel: p.masteryLevel,
    }))

    return NextResponse.json({ plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch curriculum plan"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
