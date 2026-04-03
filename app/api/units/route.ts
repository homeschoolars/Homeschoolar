import { NextResponse } from "next/server"
import { listCurriculumUnits } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get("subjectId")
    if (!subjectId) {
      return NextResponse.json({ error: "subjectId query param is required" }, { status: 400 })
    }
    const units = await listCurriculumUnits(subjectId)
    return NextResponse.json({ units })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch units"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
