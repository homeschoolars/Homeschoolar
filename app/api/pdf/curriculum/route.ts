import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { CurriculumPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { subjects, ageGroup, childName } = await request.json()

    const buffer = await renderToBuffer(CurriculumPDF({ subjects, ageGroup, childName }))
    const pdfBytes = new Uint8Array(buffer)

    return new NextResponse(pdfBytes, {
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
