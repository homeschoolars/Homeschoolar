import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { RecommendationsPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { childName, recommendations } = await request.json()

    const buffer = await renderToBuffer(RecommendationsPDF({ childName, recommendations }))
    const pdfBytes = new Uint8Array(buffer)

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${childName.replace(/\s+/g, "-").toLowerCase()}-recommendations.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating recommendations PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
