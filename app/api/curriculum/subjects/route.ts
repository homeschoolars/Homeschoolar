import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import {
  createCurriculumSubject,
  listCurriculumSubjects,
} from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ageGroup = searchParams.get("ageGroup")
    if (!ageGroup) {
      return NextResponse.json({ error: "ageGroup query param is required" }, { status: 400 })
    }
    const subjects = await listCurriculumSubjects(ageGroup)
    if (!subjects) {
      return NextResponse.json({ error: "Age group not found" }, { status: 404 })
    }
    return NextResponse.json({ subjects })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subjects"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("admin")

    const body = (await req.json()) as {
      ageGroup: string
      name: string
      slug: string
      displayOrder?: number
      baseSubjectId?: string | null
    }

    if (!body.ageGroup || !body.name || !body.slug) {
      return NextResponse.json({ error: "ageGroup, name and slug are required" }, { status: 400 })
    }

    const subject = await createCurriculumSubject(body)
    return NextResponse.json({ subject }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create subject"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
