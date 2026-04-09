import { NextResponse } from "next/server"
import { z } from "zod"
import { generateAssessmentQuiz } from "@/lib/assessment/generateQuiz"
import { generateAssessmentReport } from "@/lib/assessment/generateReport"
import { getAssessmentAgeYears } from "@/lib/assessment/child-age"
import { getChildIdFromStudentRequest } from "@/lib/assessment/student-request-auth"
import { readParentGateCookie } from "@/lib/parent-gate-cookie"
import { prisma } from "@/lib/prisma"
import { isOpenAIConfigured } from "@/lib/openai"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check"), childId: z.string().uuid() }),
  z.object({ action: z.literal("generate_quiz"), childId: z.string().uuid() }),
  z.object({
    action: z.literal("submit"),
    childId: z.string().uuid(),
    answers: z.record(z.union([z.string(), z.number()])),
  }),
])

async function loadChild(childId: string) {
  return prisma.child.findUnique({
    where: { id: childId },
    include: { profile: { select: { ageYears: true, religion: true } } },
  })
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = bodySchema.parse(json)

    const sessionChildId = getChildIdFromStudentRequest(req)
    if (!sessionChildId || sessionChildId !== body.childId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const child = await loadChild(body.childId)
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const ageYears = getAssessmentAgeYears(child.profile, child.ageGroup)
    const isMuslim = child.profile?.religion === "muslim"

    if (body.action === "check") {
      const existing = await prisma.assessmentReport.findFirst({
        where: { childId: child.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      return NextResponse.json({
        hasAssessment: !!existing,
        isParentMode: ageYears <= 6,
        ageYears,
      })
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI assessment is not configured" }, { status: 503 })
    }

    if (body.action === "generate_quiz") {
      const existingReport = await prisma.assessmentReport.findFirst({
        where: { childId: child.id },
        select: { id: true },
      })
      if (existingReport) {
        return NextResponse.json({ error: "Assessment already completed" }, { status: 400 })
      }

      if (ageYears <= 6) {
        const gate = readParentGateCookie(req.headers.get("cookie"))
        if (!gate || gate.childId !== child.id) {
          return NextResponse.json({ error: "Parent verification required" }, { status: 403 })
        }
      }

      const staleSessions = await prisma.assessmentSession.findMany({
        where: { childId: child.id, status: "in_progress" },
      })
      const now = Date.now()
      for (const s of staleSessions) {
        if (now - s.createdAt.getTime() > SESSION_MAX_AGE_MS) {
          await prisma.assessmentSession.update({
            where: { id: s.id },
            data: { status: "abandoned" },
          })
        }
      }

      const active = await prisma.assessmentSession.findFirst({
        where: { childId: child.id, status: "in_progress" },
        orderBy: { createdAt: "desc" },
      })
      if (active && now - active.createdAt.getTime() <= SESSION_MAX_AGE_MS) {
        return NextResponse.json({ quiz: active.quizData, sessionId: active.id, reused: true })
      }

      const quiz = await generateAssessmentQuiz(ageYears, isMuslim, child.name)
      const row = await prisma.assessmentSession.create({
        data: {
          childId: child.id,
          quizData: quiz as object,
          status: "in_progress",
        },
      })
      return NextResponse.json({ quiz, sessionId: row.id, reused: false })
    }

    if (body.action === "submit") {
      const existingReport = await prisma.assessmentReport.findFirst({
        where: { childId: child.id },
        select: { id: true },
      })
      if (existingReport) {
        return NextResponse.json({ error: "Assessment already submitted" }, { status: 400 })
      }

      if (ageYears <= 6) {
        const gate = readParentGateCookie(req.headers.get("cookie"))
        if (!gate || gate.childId !== child.id) {
          return NextResponse.json({ error: "Parent verification required" }, { status: 403 })
        }
      }

      const sess = await prisma.assessmentSession.findFirst({
        where: { childId: child.id, status: "in_progress" },
        orderBy: { createdAt: "desc" },
      })
      if (!sess) {
        return NextResponse.json({ error: "No active quiz session" }, { status: 404 })
      }

      const quiz = sess.quizData as Parameters<typeof generateAssessmentReport>[0]
      const answers = body.answers
      const report = await generateAssessmentReport(quiz, answers, child.name, ageYears)

      const scores: Record<string, { pct: number; total: number; max: number }> = {}
      for (const s of report.subjectScores) {
        scores[s.subject] = { pct: s.score, total: 100, max: 100 }
      }

      const tier = report.hiddenDifficultyLevel?.level
      if (typeof tier !== "number" || tier < 1 || tier > 5) {
        return NextResponse.json({ error: "Invalid report from model" }, { status: 502 })
      }

      await prisma.$transaction(async (tx) => {
        await tx.assessmentReport.create({
          data: {
            childId: child.id,
            age: ageYears,
            scores: scores as object,
            openAnswers: answers as object,
            report: report as object,
            learnerType: report.learningProfile.learnerType,
            interestProfile: report.interestProfile.primary,
            aptitudeProfile: `${report.iqEstimate.category} · ${report.eqEstimate.category}`,
            assessmentKind: "ai_holistic",
            holisticQuizData: quiz as object,
            holisticAnswers: answers as object,
            difficultyTier: tier,
            iqEstimateScore: report.iqEstimate.score,
            eqEstimateScore: report.eqEstimate.score,
          },
        })

        await tx.child.update({
          where: { id: child.id },
          data: {
            assessmentCompleted: true,
            aiAssessmentDifficultyTier: tier,
          },
        })

        await tx.assessmentSession.update({
          where: { id: sess.id },
          data: { status: "completed" },
        })
      })

      try {
        const curriculumService = await import("@/services/curriculum-composer-service")
        const curriculum = await curriculumService.generateAICurriculum(child.id, child.parentId)
        await curriculumService.saveCurriculum(child.id, curriculum)
      } catch (e) {
        console.error("[assessment/generate] curriculum generation failed", e)
      }

      try {
        await prisma.notification.create({
          data: {
            userId: child.parentId,
            title: `Learning assessment ready: ${child.name}`,
            message: `${child.name} finished their learning guide quiz. View the full report on your dashboard.`,
            type: "success",
            actionUrl: `/parent/children/${child.id}/report`,
            actionLabel: "View report",
          },
        })
      } catch (e) {
        console.error("[assessment/generate] notification failed", e)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("[assessment/generate]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
