import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { InsightsReportPDF, type InsightsReportData } from "@/components/pdf/pdf-templates"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const childName = typeof body.childName === "string" ? body.childName : "Student"
    const insights =
      body.insights && typeof body.insights === "object" && !Array.isArray(body.insights)
        ? (body.insights as Record<string, unknown>)
        : {}
    const summary =
      body.summary && typeof body.summary === "object" && !Array.isArray(body.summary)
        ? (body.summary as Record<string, unknown>)
        : undefined

    const buffer = await renderToBuffer(
      InsightsReportPDF({
        childName,
        insights: insights as InsightsReportData["insights"],
        summary: summary as InsightsReportData["summary"],
      }),
    )
    const pdfBytes = new Uint8Array(buffer)

    const slug = (childName || "child").replace(/\s+/g, "-").toLowerCase()
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-insights-report.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating insights PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
