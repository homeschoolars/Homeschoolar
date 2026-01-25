import "server-only"
import { z } from "zod"
import { generateObject } from "ai"
import { google } from "@/lib/google-ai"
import { prisma } from "@/lib/prisma"
import { toPrismaAgeGroup } from "@/lib/age-group"
import type { AgeGroup } from "@/lib/types"
import { buildLessonQuizPrompt } from "@/services/ai-prompts"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const lessonQuizQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("multiple_choice"),
  question: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct_answer: z.string(),
  distractor_rationale: z.record(z.string()).optional(),
  skill_tested: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number(),
})

const lessonQuizSchema = z.object({
  questions: z.array(lessonQuizQuestionSchema).min(15).max(25),
})

export type LessonQuizQuestion = z.infer<typeof lessonQuizQuestionSchema>

export interface GenerateLessonQuizInput {
  subject_id: string
  subject_name: string
  topic: string
  concept_id: string
  age_group: AgeGroup
  lesson_summary?: string
  recent_topics?: string[]
  userId: string
}

/** Phase 1: AI Lesson Quiz – 20 MCQs per lesson, 4 options, age-scaled, concept-focused. Cacheable. */
export async function generateLessonQuiz(input: GenerateLessonQuizInput) {
  const {
    subject_id,
    subject_name,
    topic,
    concept_id,
    age_group,
    lesson_summary,
    recent_topics,
    userId,
  } = input
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  const cached = await prisma.lessonQuiz.findUnique({
    where: {
      subjectId_topic_conceptId_ageGroup: {
        subjectId: subject_id,
        topic,
        conceptId: concept_id,
        ageGroup: toPrismaAgeGroup(age_group),
      },
    },
  })
  if (cached) {
    return {
      id: cached.id,
      questions: cached.questions as unknown as LessonQuizQuestion[],
      maxScore: cached.maxScore,
    }
  }

  const prompt = buildLessonQuizPrompt({
    subject: subject_name,
    topic,
    conceptId: concept_id,
    ageGroup: age_group,
    lessonSummary: lesson_summary,
    recentTopics: recent_topics,
  })

  const result = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: lessonQuizSchema,
    prompt,
    maxOutputTokens: 6000,
  })

  const raw = result.object.questions
  const questions = raw.length >= 20 ? raw.slice(0, 20) : raw
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

  const quiz = await prisma.lessonQuiz.upsert({
    where: {
      subjectId_topic_conceptId_ageGroup: {
        subjectId: subject_id,
        topic,
        conceptId: concept_id,
        ageGroup: toPrismaAgeGroup(age_group),
      },
    },
    update: { questions: questions as unknown as object, maxScore },
    create: {
      subjectId: subject_id,
      topic,
      conceptId: concept_id,
      ageGroup: toPrismaAgeGroup(age_group),
      questions: questions as unknown as object,
      maxScore,
    },
  })

  return {
    id: quiz.id,
    questions: quiz.questions as unknown as LessonQuizQuestion[],
    maxScore: quiz.maxScore,
  }
}
