import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/auth-helpers"
import { extractYouTubeVideoId } from "@/lib/youtube"
import { prisma } from "@/lib/prisma"
import {
  fetchYouTubeVideoMetadata,
  YouTubeMetadataError,
} from "@/services/youtube-metadata-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  youtubeUrl: z.string().min(1, "youtubeUrl is required").max(2048),
  lessonId: z.string().uuid("lessonId must be a valid UUID"),
  /** If true, fetch metadata only — no database write (for admin preview). */
  dryRun: z.boolean().optional(),
})

function mapVideoToPreview(v: {
  videoId: string
  title: string
  description: string | null
  thumbnail: string | null
  duration: string | null
}) {
  return {
    videoId: v.videoId,
    title: v.title,
    description: v.description,
    thumbnail: v.thumbnail,
    duration: v.duration,
  }
}

/**
 * POST /api/admin/curriculum/lesson-videos
 * Attach a YouTube video to a curriculum lesson (YouTube Data API v3 — server only).
 */
export async function POST(request: Request) {
  try {
    await requireRole("admin")

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { youtubeUrl, lessonId, dryRun } = parsed.data

    const lesson = await prisma.curriculumLesson.findUnique({
      where: { id: lessonId },
      select: { id: true, title: true },
    })
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const parsedVideoId = extractYouTubeVideoId(youtubeUrl)
    if (!parsedVideoId) {
      return NextResponse.json(
        { error: "Invalid or unsupported YouTube URL.", code: "INVALID_URL" },
        { status: 400 },
      )
    }

    const existing = await prisma.video.findUnique({
      where: {
        lessonId_videoId: { lessonId, videoId: parsedVideoId },
      },
    })

    if (existing) {
      if (dryRun) {
        return NextResponse.json({
          preview: {
            ...mapVideoToPreview(existing),
            lessonTitle: lesson.title,
          },
          fromDatabase: true,
        })
      }
      return NextResponse.json(
        { error: "This video is already attached to this lesson.", code: "DUPLICATE" },
        { status: 409 },
      )
    }

    const apiKey = process.env.YOUTUBE_API_KEY

    let meta
    try {
      meta = await fetchYouTubeVideoMetadata(youtubeUrl, apiKey)
    } catch (e) {
      if (e instanceof YouTubeMetadataError) {
        const status =
          e.code === "INVALID_URL" || e.code === "NOT_FOUND" || e.code === "NOT_EMBEDDABLE"
            ? 400
            : e.code === "QUOTA_EXCEEDED"
              ? 429
              : e.code === "NO_API_KEY"
                ? 503
                : 502
        return NextResponse.json({ error: e.message, code: e.code }, { status })
      }
      throw e
    }

    if (dryRun) {
      return NextResponse.json({
        preview: {
          videoId: meta.videoId,
          title: meta.title,
          description: meta.description,
          thumbnail: meta.thumbnail,
          duration: meta.duration,
          lessonTitle: lesson.title,
        },
      })
    }

    const video = await prisma.video.create({
      data: {
        videoId: meta.videoId,
        title: meta.title,
        description: meta.description,
        thumbnail: meta.thumbnail,
        duration: meta.duration,
        lessonId,
      },
    })

    return NextResponse.json({
      video: {
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        duration: video.duration,
        lessonId: video.lessonId,
        createdAt: video.createdAt.toISOString(),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "This video is already attached to this lesson.", code: "DUPLICATE" },
        { status: 409 },
      )
    }
    const message = e instanceof Error ? e.message : "Failed to add video"
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    console.error("[admin/curriculum/lesson-videos]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
