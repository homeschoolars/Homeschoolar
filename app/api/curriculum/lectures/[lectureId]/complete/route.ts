import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { initializeStudentProgress } from "@/services/progression"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lectureId: string }> },
) {
  try {
    const body = (await request.json()) as { childId?: string }
    if (!body.childId) {
      return fail("childId is required", 400)
    }

    const { lectureId } = await params
    const decoded = decodeURIComponent(lectureId)

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.childId, session, request })

    const lecture = await prisma.curriculumLecture.findUnique({
      where: { id: decoded },
      select: { id: true, lessonId: true },
    })
    if (!lecture) {
      return fail("Lecture not found", 404)
    }

    await initializeStudentProgress(body.childId, lecture.lessonId)

    await prisma.studentLectureProgress.upsert({
      where: {
        studentId_lectureId: { studentId: body.childId, lectureId: lecture.id },
      },
      update: { completedAt: new Date() },
      create: {
        studentId: body.childId,
        lectureId: lecture.id,
        completedAt: new Date(),
      },
    })

    return ok({ lectureId: lecture.id, lessonId: lecture.lessonId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete lecture"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
