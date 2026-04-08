import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { studentMeetsLessonAiAge } from "@/lib/student-ai-eligibility"
import { generateStructuredLessonAsset } from "@/services/curriculum-structured-service"
import { assertStudentLessonContentAccess } from "@/services/progression"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CONTENT_TYPES = ["activity", "quiz", "worksheet", "project", "reflection", "research", "debate"] as const
type ContentType = (typeof CONTENT_TYPES)[number]

const inFlight = new Map<string, Promise<{ cached: boolean; content: string; contentJson: unknown }>>()

function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      childId?: string
      lessonId?: string
      contentType?: string
      forceRegenerate?: boolean
    }

    if (!body.lessonId || !body.contentType) {
      return fail("lessonId and contentType are required", 400)
    }
    if (!body.childId) {
      return fail("childId is required", 400)
    }
    if (!isContentType(body.contentType)) {
      return fail("Invalid contentType", 400)
    }
    const lessonId = body.lessonId
    const contentType: ContentType = body.contentType

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.childId, session, request })

    const child = await prisma.child.findUnique({
      where: { id: body.childId },
      select: { ageGroup: true, profile: { select: { ageYears: true } } },
    })
    if (!child) {
      return fail("Child not found", 404)
    }

    const isParent = session?.user?.role === "parent"
    const isAdmin = session?.user?.role === "admin"
    if (!isParent && !isAdmin) {
      if (!studentMeetsLessonAiAge(child.profile?.ageYears ?? null, child.ageGroup)) {
        return fail("AI generation is available for students older than 7", 403)
      }
      await assertStudentLessonContentAccess(body.childId, lessonId)
    } else if (!isAdmin) {
      await assertStudentLessonContentAccess(body.childId, lessonId)
    }

    const lesson = await prisma.curriculumLesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        unit: {
          select: {
            title: true,
            subject: { select: { name: true, ageGroup: { select: { name: true } } } },
          },
        },
      },
    })
    if (!lesson) {
      return fail("Lesson not found", 404)
    }

    const cacheKey = `${lessonId}:${contentType}:${body.childId}`
    const generator = async () =>
      generateStructuredLessonAsset({
        lessonId,
        contentType,
        forceRegenerate: Boolean(body.forceRegenerate),
        studentId: body.childId,
      })

    const generatedPromise = inFlight.get(cacheKey) ?? generator()
    inFlight.set(cacheKey, generatedPromise)
    const generated = await generatedPromise.finally(() => {
      inFlight.delete(cacheKey)
    })

    return ok({
      lessonId: body.lessonId,
      contentType,
      cached: generated.cached,
      lessonContext: {
        age: lesson.unit.subject.ageGroup.name,
        subject: lesson.unit.subject.name,
        topic: lesson.unit.title,
        lesson: lesson.title,
      },
      contentJson: generated.contentJson,
      content: generated.content,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate AI content"
    if (message.includes("rate limit") || message.includes("quota")) {
      const retryAfter = 30
      return NextResponse.json(
        { success: false, error: "rate_limited", details: { retryAfterSeconds: retryAfter } },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      )
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
