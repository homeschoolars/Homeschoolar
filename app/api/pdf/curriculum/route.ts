import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { CurriculumPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { subjects, ageGroup, childName } = await request.json()

    const buffer = await renderToBuffer(CurriculumPDF({ subjects, ageGroup, childName }))
    const pdfArrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="curriculum-${ageGroup}-years.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating curriculum PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
