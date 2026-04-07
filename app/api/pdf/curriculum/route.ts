import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { CurriculumPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { subjects, ageGroup, childName, learningClass } = await request.json()

    const buffer = await renderToBuffer(
      CurriculumPDF({ subjects, ageGroup, childName, learningClass: learningClass as string | undefined }),
    )
    const pdfBytes = new Uint8Array(buffer)

    const slug =
      typeof learningClass === "string" && learningClass.trim()
        ? learningClass.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase()
        : String(ageGroup).replace(/\//g, "-")

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="curriculum-${slug}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating curriculum PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
