import { NextResponse } from "next/server"
import { listCurriculumLessons } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const unitId = searchParams.get("unitId")
    if (!unitId) {
      return NextResponse.json({ error: "unitId query param is required" }, { status: 400 })
    }
    const lessons = await listCurriculumLessons(unitId)
    return NextResponse.json({ lessons })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lessons"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
