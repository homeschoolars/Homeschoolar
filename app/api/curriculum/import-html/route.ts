import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { buildCurriculumPayloadsFromHtml } from "@/lib/curriculum-html-parser"
import { importCurriculumForAgeGroup } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    await requireRole("admin")

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "HTML file is required" }, { status: 400 })
    }

    const html = await file.text()
    const imports = buildCurriculumPayloadsFromHtml(html)

    const summary: Array<{ ageGroup: string; subjects: number; units: number; lessons: number }> = []
    for (const item of imports) {
      const result = await importCurriculumForAgeGroup({
        ageGroup: item.ageGroup,
        stageName: item.stageName,
        payload: item.payload,
      })
      summary.push({
        ageGroup: item.ageGroup,
        subjects: result.subjects,
        units: result.units,
        lessons: result.lessons,
      })
    }

    return NextResponse.json({ ok: true, imported: summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import curriculum HTML"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
