import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import {
  deleteCurriculumSubject,
  getCurriculumSubject,
  updateCurriculumSubject,
} from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const { searchParams } = new URL(req.url)
    const ageGroup = searchParams.get("ageGroup")

    if (!ageGroup) {
      return NextResponse.json({ error: "ageGroup query param is required" }, { status: 400 })
    }

    const subject = await getCurriculumSubject({
      ageGroup,
      subjectId: decodeURIComponent(subjectId),
    })

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    return NextResponse.json({ subject })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subject"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    await requireRole("admin")

    const { subjectId } = await params
    const body = (await req.json()) as Partial<{
      name: string
      slug: string
      category: "CORE" | "FUTURE" | "CREATIVE" | "LIFE"
      orderIndex: number
      displayOrder: number
      baseSubjectId: string | null
    }>

    const updated = await updateCurriculumSubject(decodeURIComponent(subjectId), body)
    return NextResponse.json({ subject: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update subject"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    await requireRole("admin")

    const { subjectId } = await params
    await deleteCurriculumSubject(decodeURIComponent(subjectId))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete subject"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
