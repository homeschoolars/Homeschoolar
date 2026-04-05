import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ lectureId: string }> },
) {
  try {
    await requireRole("admin")

    const { lectureId } = await params
    await prisma.curriculumLecture.delete({
      where: { id: decodeURIComponent(lectureId) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete lecture"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
