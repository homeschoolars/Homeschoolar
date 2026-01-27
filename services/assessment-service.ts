import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import type { AssessmentType, Difficulty } from "@/lib/types"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { updateLearningMemoryFromAssessment } from "@/services/memory-service"

const questionSchema = z.object({
  question: z.string(),
  expected_answer: z.string(),
  ai_explanation: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const assessmentGenerateSchema = z.object({
  questions: z.array(questionSchema).min(5).max(15),
})

const assessmentResultSchema = z.object({
  raw_score: z.number(),
  normalized_score: z.number().min(0).max(100),
  strengths: z.array(z.object({ concept: z.string(), evidence: z.string().optional() })),
  weaknesses: z.array(z.object({ concept: z.string(), evidence: z.string().optional() })),
  ai_summary: z.string(),
})

function buildAssessmentPrompt({
  childName,
  ageGroup,
  subjectName,
  assessmentType,
  difficulty,
}: {
  childName: string
  ageGroup: string
  subjectName: string
  assessmentType: AssessmentType
  difficulty?: Difficulty | null
}) {
  return `Create a ${assessmentType} assessment for ${childName} (age group ${ageGroup}) in ${subjectName}.
Use child-friendly language and age-appropriate questions.
Provide expected answers and short explanations.
Difficulty hint: ${difficulty ?? "mixed"}.
Return 8-12 questions.`
}

function buildAssessmentGradingPrompt({
  subjectName,
  questions,
  answers,
}: {
  subjectName: string
  questions: Array<{ id: string; question: string; expected_answer: string }>
  answers: Array<{ question_id: string; answer: string }>
}) {
  return `Grade this assessment for subject ${subjectName}.
Provide raw_score, normalized_score (0-100), strengths and weaknesses by concept, and an ai_summary.
Questions: ${JSON.stringify(questions)}
Answers: ${JSON.stringify(answers)}`
}

export async function createAssessment({
  childId,
  subjectId,
  assessmentType,
  difficultyLevel,
  userId,
}: {
  childId: string
  subjectId: string
  assessmentType: AssessmentType
  difficultyLevel?: Difficulty | null
  userId: string
}) {
  await enforceSubscriptionAccess({ userId, feature: "ai" })
  const child = await prisma.child.findUnique({ where: { id: childId } })
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
  if (!child || !subject) {
    throw new Error("Child or subject not found")
  }

  const result = await generateObject({
    model: openai("gpt-5-mini"),
    schema: assessmentGenerateSchema,
    prompt: buildAssessmentPrompt({
      childName: child.name,
      ageGroup: toApiAgeGroup(child.ageGroup),
      subjectName: subject.name,
      assessmentType,
      difficulty: difficultyLevel ?? null,
    }),
    maxTokens: 2000,
  })

  const assessment = await prisma.assessment.create({
    data: {
      childId,
      subjectId,
      assessmentType,
      difficultyLevel: difficultyLevel ?? null,
      status: "pending",
      questions: result.object.questions as unknown as object,
    },
  })

  await prisma.assessmentQuestion.createMany({
    data: result.object.questions.map((question) => ({
      assessmentId: assessment.id,
      question: question.question,
      expectedAnswer: question.expected_answer,
      aiExplanation: question.ai_explanation ?? null,
      metadata: (question.metadata ?? {}) as unknown as object,
    })),
  })

  return assessment
}

export async function submitAssessment({
  assessmentId,
  answers,
  userId,
}: {
  assessmentId: string
  answers: Array<{ question_id: string; answer: string }>
  userId: string
}) {
  await enforceSubscriptionAccess({ userId, feature: "ai" })
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { subject: true, assessmentQuestions: true },
  })
  if (!assessment || !assessment.subject) {
    throw new Error("Assessment not found")
  }

  const gradingResult = await generateObject({
    model: openai("gpt-5-mini"),
    schema: assessmentResultSchema,
    prompt: buildAssessmentGradingPrompt({
      subjectName: assessment.subject.name,
      questions: assessment.assessmentQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        expected_answer: q.expectedAnswer,
      })),
      answers,
    }),
    maxTokens: 1500,
  })

  const result = gradingResult.object

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      status: "completed",
      answers: answers as unknown as object,
      score: result.raw_score,
      completedAt: new Date(),
    },
  })

  const assessmentResult = await prisma.assessmentResult.upsert({
    where: { assessmentId },
    update: {
      rawScore: result.raw_score,
      normalizedScore: result.normalized_score,
      strengths: result.strengths as unknown as object,
      weaknesses: result.weaknesses as unknown as object,
      aiSummary: result.ai_summary,
      evaluatedAt: new Date(),
    },
    create: {
      assessmentId,
      rawScore: result.raw_score,
      normalizedScore: result.normalized_score,
      strengths: result.strengths as unknown as object,
      weaknesses: result.weaknesses as unknown as object,
      aiSummary: result.ai_summary,
      evaluatedAt: new Date(),
    },
  })

  await updateLearningMemoryFromAssessment({
    childId: assessment.childId,
    subjectId: assessment.subjectId,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
  })

  return assessmentResult
}
