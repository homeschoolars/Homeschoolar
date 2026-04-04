import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { generateStructuredLessonAsset } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CONTENT_TYPES = ["quiz", "worksheet", "project", "reflection", "research", "debate"] as const
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
    if (!isContentType(body.contentType)) {
      return fail("Invalid contentType", 400)
    }

    if (body.childId) {
      const session = await auth()
      await enforceParentOrStudentChildAccess({ childId: body.childId, session, request })
    }

    const lesson = await prisma.curriculumLesson.findUnique({
      where: { id: body.lessonId },
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

    const cacheKey = `${body.lessonId}:${body.contentType}`
    const generator = async () =>
      generateStructuredLessonAsset({
        lessonId: body.lessonId!,
        contentType: body.contentType,
        forceRegenerate: Boolean(body.forceRegenerate),
      })

    const generatedPromise = inFlight.get(cacheKey) ?? generator()
    inFlight.set(cacheKey, generatedPromise)
    const generated = await generatedPromise.finally(() => {
      inFlight.delete(cacheKey)
    })

    return ok({
      lessonId: body.lessonId,
      contentType: body.contentType,
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
