import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { ensureStudentCurriculumAgeGroupLink } from "@/lib/student-curriculum-link"
import { prisma } from "@/lib/prisma"
import { listCurriculumSubjects } from "@/services/curriculum-structured-service"
import { toCurriculumAgeGroupName } from "@/lib/age-group"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/subjects?student_id=UUID — subjects for the student's enrolled age band (preferred).
 * GET /api/subjects?age=AGE_8_9 — legacy curriculum age group name.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("student_id")
    const age = searchParams.get("age")

    let ageKey: string | null = null
    let ageGroupId: string | null = null
    let ageGroupName: string | null = null

    if (studentId) {
      const session = await auth()
      await enforceParentOrStudentChildAccess({ childId: studentId, session, request: req })
      await ensureStudentCurriculumAgeGroupLink(studentId)

      const child = await prisma.child.findUnique({
        where: { id: studentId },
        select: {
          ageGroup: true,
          curriculumAgeGroupId: true,
          curriculumAgeGroup: { select: { id: true, name: true, stageName: true } },
        },
      })
      if (!child) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      ageKey = child.ageGroup
      ageGroupId = child.curriculumAgeGroup?.id ?? child.curriculumAgeGroupId
      ageGroupName = child.curriculumAgeGroup?.stageName ?? child.ageGroup
    } else if (age) {
      ageKey = age
      const row = await prisma.curriculumAgeGroup.findUnique({
        where: { name: toCurriculumAgeGroupName(age) },
        select: { id: true, name: true, stageName: true },
      })
      if (row) {
        ageGroupId = row.id
        ageGroupName = row.stageName
      }
    } else {
      return NextResponse.json({ error: "student_id or age query param is required" }, { status: 400 })
    }

    const subjects = await listCurriculumSubjects(ageKey)
    if (!subjects) {
      return NextResponse.json({ error: "Age group not found" }, { status: 404 })
    }

    return NextResponse.json({
      subjects,
      age_group_id: ageGroupId,
      age_group_name: ageGroupName,
      student_id: studentId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subjects"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
