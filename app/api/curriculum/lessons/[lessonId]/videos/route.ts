import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { getCurriculumLesson } from "@/services/curriculum-structured-service"
import { getStudentLessonState } from "@/services/progression"
import {
  isLessonVideosTableMissingError,
  LESSON_VIDEOS_MIGRATION_HINT,
} from "@/lib/prisma-lesson-videos"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/curriculum/lessons/[lessonId]/videos?childId=
 * Returns stored lesson videos (no YouTube API). Student sees videos only when lesson is unlocked/completed.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const { lessonId: raw } = await params
    const lessonId = decodeURIComponent(raw)

    const lesson = await getCurriculumLesson(lessonId)
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const session = await auth()

    if (session?.user?.role === "admin") {
      const rows = await prisma.video.findMany({
        where: { lessonId: lesson.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          videoId: true,
          title: true,
          description: true,
          thumbnail: true,
          duration: true,
          lessonId: true,
          createdAt: true,
        },
      })
      return NextResponse.json({
        videos: rows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
      })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")
    if (!childId) {
      return NextResponse.json({ error: "childId query parameter is required" }, { status: 400 })
    }

    await enforceParentOrStudentChildAccess({ childId, session, request: req })

    if (session?.user?.role === "parent") {
      const rows = await prisma.video.findMany({
        where: { lessonId: lesson.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          videoId: true,
          title: true,
          description: true,
          thumbnail: true,
          duration: true,
          lessonId: true,
          createdAt: true,
        },
      })
      return NextResponse.json({
        videos: rows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
      })
    }

    const state = await getStudentLessonState(childId, lesson.id)
    if (!state.canAccess) {
      return NextResponse.json({ videos: [] })
    }

    const rows = await prisma.video.findMany({
      where: { lessonId: lesson.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        videoId: true,
        title: true,
        description: true,
        thumbnail: true,
        duration: true,
        lessonId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      videos: rows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    })
  } catch (e) {
    if (isLessonVideosTableMissingError(e)) {
      return NextResponse.json(
        { videos: [], error: LESSON_VIDEOS_MIGRATION_HINT, code: "MIGRATION_REQUIRED" },
        { status: 503 },
      )
    }
    const message = e instanceof Error ? e.message : "Failed to load videos"
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (message === "Forbidden" || message === "StudentDashboardLocked") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[lessons/.../videos]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
