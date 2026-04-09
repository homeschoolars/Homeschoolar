import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess, requireRole } from "@/lib/auth-helpers"
import { ensureStudentCurriculumAgeGroupLink } from "@/lib/student-curriculum-link"
import { prisma } from "@/lib/prisma"
import {
  deleteCurriculumSubject,
  getCurriculumSubject,
  updateCurriculumSubject,
} from "@/services/curriculum-structured-service"
import { toCurriculumAgeGroupName } from "@/lib/age-group"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    let ageGroup = searchParams.get("ageGroup")

    if (studentId) {
      const session = await auth()
      await enforceParentOrStudentChildAccess({ childId: studentId, session, request: req })
      await ensureStudentCurriculumAgeGroupLink(studentId)
      const child = await prisma.child.findUnique({
        where: { id: studentId },
        select: { ageGroup: true },
      })
      if (!child) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      ageGroup = child.ageGroup
    }

    if (!ageGroup) {
      return NextResponse.json({ error: "ageGroup or studentId query param is required" }, { status: 400 })
    }

    const curriculumAgeName = toCurriculumAgeGroupName(ageGroup)

    const subject = await getCurriculumSubject({
      ageGroup: curriculumAgeName,
      subjectId: decodeURIComponent(subjectId),
    })

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const level = await prisma.curriculumAgeGroup.findUnique({
      where: { name: curriculumAgeName },
      select: { id: true, name: true, stageName: true },
    })

    return NextResponse.json({ subject, level })
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
