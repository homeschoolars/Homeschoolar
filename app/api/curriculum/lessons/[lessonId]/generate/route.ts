import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { safeParseRequestJson } from "@/lib/safe-json"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { studentMeetsLessonAiAge } from "@/lib/student-ai-eligibility"
import { generateLessonAsset } from "@/services/curriculum-structured-service"
import { assertStudentLessonContentAccess } from "@/services/progression"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const decoded = decodeURIComponent(lessonId)
    const body = await safeParseRequestJson(req, {} as {
      type: "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"
      sessionKey?: string
      childId?: string
    })

    if (!body?.type || !["story", "worksheet", "quiz", "project", "debate", "research", "reflection"].includes(body.type)) {
      return NextResponse.json(
        { error: "type must be one of story, worksheet, quiz, project, debate, research, reflection" },
        { status: 400 }
      )
    }

    if (!body.childId) {
      return NextResponse.json({ error: "childId is required" }, { status: 400 })
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.childId, session, request: req })

    const child = await prisma.child.findUnique({
      where: { id: body.childId },
      select: { profile: { select: { ageYears: true } }, ageGroup: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const isParent = session?.user?.role === "parent"
    const isAdmin = session?.user?.role === "admin"
    if (!isParent && !isAdmin) {
      if (!studentMeetsLessonAiAge(child.profile?.ageYears ?? null, child.ageGroup)) {
        return NextResponse.json({ error: "AI generation is available for students older than 7" }, { status: 403 })
      }
      await assertStudentLessonContentAccess(body.childId, decoded)
    } else if (!isAdmin) {
      await assertStudentLessonContentAccess(body.childId, decoded)
    }

    const result = await generateLessonAsset({
      lessonId: decoded,
      type: body.type,
      sessionKey: body.sessionKey,
      studentId: body.childId,
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
