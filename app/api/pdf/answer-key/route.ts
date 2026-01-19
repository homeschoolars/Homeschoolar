import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { WorksheetPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { worksheet } = await request.json()

    const buffer = await renderToBuffer(WorksheetPDF({ worksheet, includeAnswerKey: true }))
    const pdfBytes = new Uint8Array(buffer)

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${worksheet.title.replace(/\s+/g, "-").toLowerCase()}-answer-key.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating answer key PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
