import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { InsightsReportPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { childName, insights, summary } = await request.json()

    const buffer = await renderToBuffer(InsightsReportPDF({ childName, insights, summary }))
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
