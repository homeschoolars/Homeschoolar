import { NextResponse } from "next/server"
import { safeParseRequestJson } from "@/lib/safe-json"
import { generateLessonAsset } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await safeParseRequestJson(req, {} as {
      lessonId: string
      type: "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"
      sessionKey?: string
    })

    if (!body.lessonId || !body.type) {
      return NextResponse.json({ error: "lessonId and type are required" }, { status: 400 })
    }

    const generated = await generateLessonAsset({
      lessonId: body.lessonId,
      type: body.type,
      sessionKey: body.sessionKey,
    })

    return NextResponse.json({ content: generated.content, cached: generated.cached })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate content"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
