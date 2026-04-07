import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { renderToBuffer } from "@react-pdf/renderer"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { HolisticLearningAssessmentPDF } from "@/components/pdf/pdf-templates"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  childId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { childId } = bodySchema.parse(await request.json())

    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: session.user.id },
      select: { name: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const latest = await prisma.assessmentReport.findFirst({
      where: { childId },
      orderBy: { createdAt: "desc" },
      select: {
        age: true,
        createdAt: true,
        scores: true,
        report: true,
      },
    })

    if (!latest) {
      return NextResponse.json({ error: "No learning assessment report found" }, { status: 404 })
    }

    const buffer = await renderToBuffer(
      HolisticLearningAssessmentPDF({
        childName: child.name,
        ageAtAssessment: latest.age,
        completedAtIso: latest.createdAt.toISOString(),
        scores: latest.scores as Record<string, { pct: number; total: number; max: number }>,
        report: latest.report as Record<string, unknown>,
      }),
    )
    const pdfBytes = new Uint8Array(buffer)
    const slug = child.name.replace(/\s+/g, "-").toLowerCase()

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-learning-assessment.pdf"`,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("[pdf/holistic-learning-assessment]", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
