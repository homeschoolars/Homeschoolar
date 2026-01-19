import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { WorksheetPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { worksheet, childName } = await request.json()

    const buffer = await renderToBuffer(WorksheetPDF({ worksheet, childName, includeAnswerKey: false }))
    const pdfArrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${worksheet.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating worksheet PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
