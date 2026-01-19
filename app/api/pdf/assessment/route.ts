import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { AssessmentReportPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { child, progress, assessments, subjects } = await request.json()

    const buffer = await renderToBuffer(AssessmentReportPDF({ child, progress, assessments, subjects }))
    const pdfArrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${child.name.replace(/\s+/g, "-").toLowerCase()}-assessment-report.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating assessment PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
