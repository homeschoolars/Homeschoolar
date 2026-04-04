import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { createCurriculumUnit, listCurriculumUnits } from "@/services/curriculum-structured-service"

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

export async function POST(req: Request) {
  try {
    await requireRole("admin")

    const body = (await req.json()) as {
      subjectId: string
      title: string
      slug: string
      orderIndex?: number
      displayOrder?: number
    }
    if (!body.subjectId || !body.title || !body.slug) {
      return NextResponse.json({ error: "subjectId, title and slug are required" }, { status: 400 })
    }
    const unit = await createCurriculumUnit(body)
    return NextResponse.json({ unit }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create unit"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
