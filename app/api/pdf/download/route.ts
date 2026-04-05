import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { generatePDF } from "@/services/adaptive-pdf-generate"
import type { AdaptiveContentType } from "@/services/adaptive-ai-validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED: AdaptiveContentType[] = ["quiz", "worksheet", "story"]

export async function GET(request: NextRequest) {
  try {
    const lessonId = request.nextUrl.searchParams.get("lessonId")
    const childId = request.nextUrl.searchParams.get("childId")
    const contentType = request.nextUrl.searchParams.get("contentType") as AdaptiveContentType | null
    const answerKey = request.nextUrl.searchParams.get("answerKey") === "1"

    if (!lessonId || !childId || !contentType || !ALLOWED.includes(contentType)) {
      return NextResponse.json(
        { error: "lessonId, childId, and contentType (quiz|worksheet|story) are required" },
        { status: 400 },
      )
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId, session, request })

    const { buffer, filename } = await generatePDF({
      studentId: childId,
      lessonId,
      contentType,
      requestOrigin: request.nextUrl.origin,
      includeAnswerKey: contentType === "quiz" && answerKey,
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF failed"
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 })
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 })
    if (msg === "NoGeneratedContent") {
      return NextResponse.json({ error: "No generated content for this lesson" }, { status: 404 })
    }
    console.error(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
