import "server-only"
import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import {
  type ErrorCategory,
  type AssessmentInsight,
  ERROR_CATEGORIES,
  MASTERY_THRESHOLDS,
} from "@/lib/ai-architecture"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const insightSchema = z.object({
  signals: z.array(
    z.object({
      type: z.enum(["strength", "weakness", "improvement", "recommendation"]),
      concept_id: z.string().optional(),
      summary: z.string(),
      suggested_action: z.string().optional(),
      evidence: z.array(z.string()).optional(),
    })
  ),
})

/** Phase 1: AI Assessment Engine (Learning Brain). Error categorization, mastery, actionable insights. */

/** Categorize a wrong answer into an error type. */
export function categorizeError(
  feedback: string,
  questionContext?: { concept?: string; skill?: string }
): ErrorCategory {
  const f = feedback.toLowerCase()
  if (
    f.includes(" misunderstand") ||
    f.includes("confus") ||
    f.includes("concept") ||
    f.includes("think that")
  )
    return "conceptual_misunderstanding"
  if (
    f.includes("step") ||
    f.includes("procedure") ||
    f.includes("calculation") ||
    f.includes("forgot to")
  )
    return "procedural_error"
  if (
    f.includes("attention") ||
    f.includes("careless") ||
    f.includes("silly") ||
    f.includes("read")
  )
    return "attention_lapse"
  if (f.includes("language") || f.includes("word") || f.includes("vocabulary"))
    return "language_barrier"
  return "conceptual_misunderstanding"
}

/** Compute mastery score 0–100 from correctness and error categories. */
export function computeMasteryScore(
  correct: number,
  total: number,
  errorCategories: ErrorCategory[]
): number {
  if (total === 0) return 0
  const base = Math.round((correct / total) * 100)
  const languagePenalty = errorCategories.filter((c) => c === "language_barrier").length * 2
  const attentionPenalty = errorCategories.filter((c) => c === "attention_lapse").length * 1
  return Math.max(0, Math.min(100, base - languagePenalty - attentionPenalty))
}

/** Generate actionable insight signals from assessments, memory, and curriculum. */
export async function generateAssessmentInsights(childId: string, userId: string): Promise<AssessmentInsight[]> {
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  const [assessments, memories, paths, behavioral] = await Promise.all([
    prisma.assessment.findMany({
      where: { childId },
      include: { subject: true, assessmentResult: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.learningMemory.findMany({ where: { childId }, include: { subject: true } }),
    prisma.curriculumPath.findMany({ where: { childId }, include: { subject: true } }),
    prisma.behavioralMemory.findUnique({ where: { childId } }),
  ])

  const prompt = `You are the Learning Brain for Homeschoolars. Generate actionable insight signals for a parent.

ASSESSMENTS (recent): ${JSON.stringify(
    assessments.map((a) => ({
      subject: a.subject?.name,
      type: a.assessmentType,
      score: a.score,
      result: a.assessmentResult ? { strengths: a.assessmentResult.strengths, weaknesses: a.assessmentResult.weaknesses, aiSummary: a.assessmentResult.aiSummary } : null,
    }))
  )}

LEARNING MEMORY (concept mastery): ${JSON.stringify(
    memories.map((m) => ({
      concept: m.concept,
      subject: m.subject?.name,
      masteryLevel: m.masteryLevel,
      evidence: m.evidence,
    }))
  )}

CURRICULUM PATHS: ${JSON.stringify(paths.map((p) => ({ subject: p.subject?.name, currentTopic: p.currentTopic, completedTopics: p.completedTopics })))}

BEHAVIORAL: ${JSON.stringify(behavioral ? { attentionPattern: behavioral.attentionPattern, learningStyle: behavioral.learningStyle } : null)}

RULES:
- Output 3–8 signals. Types: strength | weakness | improvement | recommendation.
- Be specific and actionable. Examples:
  - "Child struggles with subtraction with borrowing across zeros"
  - "Consistently confuses photosynthesis with respiration"
  - "Shows improvement in geometric shapes recognition"
- No jargon. Positive framing where possible.
- concept_id when referring to a specific concept; summary required; suggested_action optional.`

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: insightSchema,
    prompt,
  })

  return result.object.signals.map((s) => ({
    type: s.type as AssessmentInsight["type"],
    concept_id: s.concept_id,
    summary: s.summary,
    suggested_action: s.suggested_action,
    evidence: s.evidence,
  }))
}

export { MASTERY_THRESHOLDS, ERROR_CATEGORIES }
