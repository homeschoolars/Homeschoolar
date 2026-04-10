import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripHiddenFromStoredJson } from "@/lib/assessment/sanitize-report"
import type { AssessmentReportPublic } from "@/lib/assessment/types-ai"
import { isHolisticReportJson } from "@/lib/assessment/report-shape"
import { HolisticReportPdfDocument } from "@/components/assessment/holistic-report-pdf"
import { HolisticLearningAssessmentPDF } from "@/components/pdf/pdf-templates"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_req: Request, ctx: { params: Promise<{ childId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { childId } = await ctx.params
    const parsed = z.string().uuid().safeParse(childId)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid child" }, { status: 400 })
    }

    const child = await prisma.child.findFirst({
      where: { id: parsed.data, parentId: session.user.id },
      select: { id: true, name: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const latest = await prisma.assessmentReport.findFirst({
      where: { childId: parsed.data },
      orderBy: { createdAt: "desc" },
    })
    if (!latest) {
      return NextResponse.json({ error: "No assessment report" }, { status: 404 })
    }

    const slug = child.name.replace(/\s+/g, "-").toLowerCase()
    let buffer: Buffer

    if (isHolisticReportJson(latest.report)) {
      const sanitized = stripHiddenFromStoredJson(latest.report) as AssessmentReportPublic
      buffer = await renderToBuffer(
        React.createElement(HolisticReportPdfDocument, {
          childName: child.name,
          age: latest.age,
          report: sanitized,
        }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>,
      )
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slug}-holistic-report.pdf"`,
        },
      })
    }

    buffer = await renderToBuffer(
      React.createElement(HolisticLearningAssessmentPDF, {
        childName: child.name,
        ageAtAssessment: latest.age,
        completedAtIso: latest.createdAt.toISOString(),
        scores: latest.scores as Record<string, { pct: number; total: number; max: number }>,
        report: latest.report as Record<string, unknown>,
      }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>,
    )
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-learning-assessment.pdf"`,
      },
    })
  } catch (e) {
    console.error("[pdf holistic report]", e)
    return NextResponse.json({ error: "PDF failed" }, { status: 500 })
  }
}
