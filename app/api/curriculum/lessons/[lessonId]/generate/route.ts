import { NextResponse } from "next/server"
import { safeParseRequestJson } from "@/lib/safe-json"
import { generateLessonAsset } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const body = await safeParseRequestJson(req, {} as {
      type: "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"
      sessionKey?: string
    })

    if (!body?.type || !["story", "worksheet", "quiz", "project", "debate", "research", "reflection"].includes(body.type)) {
      return NextResponse.json(
        { error: "type must be one of story, worksheet, quiz, project, debate, research, reflection" },
        { status: 400 }
      )
    }

    const result = await generateLessonAsset({
      lessonId: decodeURIComponent(lessonId),
      type: body.type,
      sessionKey: body.sessionKey,
    })

    return NextResponse.json({
      lessonId,
      type: body.type,
      content: result.content,
      cached: result.cached,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate lesson content"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
