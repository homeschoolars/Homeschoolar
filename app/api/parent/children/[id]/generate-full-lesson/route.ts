import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { safeParseRequestJson } from "@/lib/safe-json"
import { prisma } from "@/lib/prisma"
import { generateWorksheet, generateQuiz } from "@/services/ai-service"
import { serializeAssignment, serializeSurpriseQuiz, serializeWorksheet } from "@/lib/serializers"
import { isOpenAIConfigured, openai } from "@/lib/openai"
import { toApiAgeGroup } from "@/lib/age-group"
import type { Difficulty } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const requestSchema = z.object({
  subjectId: z.string().uuid(),
  lessonTitle: z.string().min(3),
  lessonObjective: z.string().min(3),
  durationMinutes: z.number().int().min(10).max(180).default(40),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  language: z.string().default("English"),
  teachingStyle: z.string().default("interactive"),
  includeWarmup: z.boolean().default(true),
  includeGuidedPractice: z.boolean().default(true),
  includeIndependentPractice: z.boolean().default(true),
  includeHomework: z.boolean().default(true),
  includeReflection: z.boolean().default(true),
  includeDifferentiation: z.boolean().default(true),
  worksheetQuestions: z.number().int().min(3).max(15).default(6),
  assignWorksheetToChild: z.boolean().default(true),
  generateQuiz: z.boolean().default(true),
  recentTopics: z.array(z.string()).default([]),
})

const lessonPlanSchema = z.object({
  title: z.string(),
  objective: z.string(),
  duration: z.string(),
  materials: z.array(z.string()),
  warmup: z.string().optional(),
  directInstruction: z.string(),
  guidedPractice: z.string().optional(),
  independentPractice: z.string().optional(),
  assessmentCheck: z.string(),
  homework: z.string().optional(),
  reflectionQuestions: z.array(z.string()).optional(),
  differentiation: z
    .object({
      support: z.string(),
      onLevel: z.string(),
      challenge: z.string(),
    })
    .optional(),
  parentTips: z.array(z.string()),
})

function buildFallbackLessonPlan(input: z.infer<typeof requestSchema>, subjectName: string) {
  return {
    title: `${subjectName} - ${input.lessonTitle}`,
    objective: input.lessonObjective,
    duration: `${input.durationMinutes} minutes`,
    materials: ["Notebook", "Pencil", "Eraser", "Subject textbook/resource"],
    warmup: input.includeWarmup ? `Quick 5-minute recap: ask 3 starter questions about "${input.lessonTitle}".` : undefined,
    directInstruction: `Teach the core concept of "${input.lessonTitle}" with examples and short checks for understanding.`,
    guidedPractice: input.includeGuidedPractice
      ? "Work through 2 examples with the child and explain each step together."
      : undefined,
    independentPractice: input.includeIndependentPractice
      ? "Child solves practice tasks independently while parent/teacher observes."
      : undefined,
    assessmentCheck: "End with 3 quick oral/written checks to confirm understanding.",
    homework: input.includeHomework
      ? `Complete one short practice activity on "${input.lessonTitle}" and review mistakes.`
      : undefined,
    reflectionQuestions: input.includeReflection
      ? ["What did you learn today?", "Which part was difficult and why?", "How can you use this in real life?"]
      : undefined,
    differentiation: input.includeDifferentiation
      ? {
          support: "Use visual aids and step-by-step hints.",
          onLevel: "Practice mixed questions at grade level.",
          challenge: "Add one applied problem that needs reasoning.",
        }
      : undefined,
    parentTips: [
      "Keep feedback specific and positive.",
      "Use short breaks if focus drops.",
      "Ask child to explain answers in their own words.",
    ],
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)

    const raw = await safeParseRequestJson(req, {} as unknown)
    const input = requestSchema.parse(raw)

    const [child, subject] = await Promise.all([
      prisma.child.findUnique({
        where: { id },
        select: { id: true, ageGroup: true, currentLevel: true },
      }),
      prisma.subject.findUnique({
        where: { id: input.subjectId },
        select: { id: true, name: true },
      }),
    ])

    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 })
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 })

    let lessonPlan: z.infer<typeof lessonPlanSchema>
    if (!isOpenAIConfigured()) {
      lessonPlan = buildFallbackLessonPlan(input, subject.name)
    } else {
      const prompt = `Create a structured lesson plan JSON for:
- Subject: ${subject.name}
- Lesson title: ${input.lessonTitle}
- Objective: ${input.lessonObjective}
- Age group: ${toApiAgeGroup(child.ageGroup)}
- Difficulty: ${input.difficulty}
- Duration: ${input.durationMinutes} minutes
- Language: ${input.language}
- Teaching style: ${input.teachingStyle}

Include sections only when enabled:
- Warmup: ${input.includeWarmup}
- Guided Practice: ${input.includeGuidedPractice}
- Independent Practice: ${input.includeIndependentPractice}
- Homework: ${input.includeHomework}
- Reflection: ${input.includeReflection}
- Differentiation: ${input.includeDifferentiation}

Return practical, concise classroom-ready content.`

      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: lessonPlanSchema,
        prompt,
      })
      lessonPlan = result.object
    }

    let worksheet: ReturnType<typeof serializeWorksheet> | null = null
    let assignment: ReturnType<typeof serializeAssignment> | null = null
    let quiz: ReturnType<typeof serializeSurpriseQuiz> | null = null
    const warnings: string[] = []

    if (input.assignWorksheetToChild) {
      try {
        const generatedWorksheet = await generateWorksheet(
          {
            subject_id: subject.id,
            subject_name: subject.name,
            age_group: toApiAgeGroup(child.ageGroup),
            difficulty: input.difficulty as Difficulty,
            topic: input.lessonTitle,
            num_questions: input.worksheetQuestions,
            child_level: child.currentLevel,
          },
          session.user.id,
          { bypassSubscriptionChecks: session.user.role === "admin", autoApprove: true }
        )

        const assignmentRow = await prisma.worksheetAssignment.create({
          data: {
            worksheetId: generatedWorksheet.id,
            childId: child.id,
            assignedBy: session.user.id,
            status: "pending",
          },
          include: { worksheet: true },
        })

        worksheet = serializeWorksheet(generatedWorksheet)
        assignment = serializeAssignment(assignmentRow)
      } catch (error) {
        warnings.push(error instanceof Error ? `Worksheet: ${error.message}` : "Worksheet generation failed")
      }
    }

    if (input.generateQuiz) {
      try {
        const generatedQuiz = await generateQuiz({
          child_id: child.id,
          subject_id: subject.id,
          subject_name: subject.name,
          age_group: toApiAgeGroup(child.ageGroup),
          recent_topics: [input.lessonTitle, ...input.recentTopics].slice(0, 6),
        })
        quiz = serializeSurpriseQuiz(generatedQuiz)
      } catch (error) {
        warnings.push(error instanceof Error ? `Quiz: ${error.message}` : "Quiz generation failed")
      }
    }

    return NextResponse.json({
      lessonPlan,
      worksheet,
      assignment,
      quiz,
      warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate full lesson"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
