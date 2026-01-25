import { prisma } from "@/lib/prisma"
import type { ErrorCategory } from "@/lib/ai-architecture"

export async function updateLearningMemoryFromAssessment({
  childId,
  subjectId,
  strengths,
  weaknesses,
  errorPatterns,
  masteryScores,
}: {
  childId: string
  subjectId: string
  strengths: Array<{ concept: string; evidence?: string }>
  weaknesses: Array<{ concept: string; evidence?: string }>
  /** Optional: map concept -> error categories for wrong answers */
  errorPatterns?: Record<string, ErrorCategory[]>
  /** Optional: map concept -> 0-100 mastery override */
  masteryScores?: Record<string, number>
}) {
  const now = new Date()

  for (const item of strengths) {
    const mastery = masteryScores?.[item.concept] ?? 80
    const patterns = errorPatterns?.[item.concept]
    const evidence = {
      latest: item.evidence ?? "Strength observed",
      ...(patterns && patterns.length > 0 ? { error_patterns: patterns } : {}),
    } as unknown as object
    await prisma.learningMemory.upsert({
      where: {
        childId_subjectId_concept: {
          childId,
          subjectId,
          concept: item.concept,
        },
      },
      update: { masteryLevel: mastery, lastUpdated: now, evidence },
      create: {
        childId,
        subjectId,
        concept: item.concept,
        masteryLevel: mastery,
        lastUpdated: now,
        evidence,
      },
    })
  }

  for (const item of weaknesses) {
    const mastery = masteryScores?.[item.concept] ?? 30
    const patterns = errorPatterns?.[item.concept]
    const evidence = {
      latest: item.evidence ?? "Needs practice",
      ...(patterns && patterns.length > 0 ? { error_patterns: patterns } : {}),
    } as unknown as object
    await prisma.learningMemory.upsert({
      where: {
        childId_subjectId_concept: {
          childId,
          subjectId,
          concept: item.concept,
        },
      },
      update: { masteryLevel: mastery, lastUpdated: now, evidence },
      create: {
        childId,
        subjectId,
        concept: item.concept,
        masteryLevel: mastery,
        lastUpdated: now,
        evidence,
      },
    })
  }
}

export async function upsertBehavioralMemory({
  childId,
  attentionPattern,
  learningStyle,
  motivationTriggers,
  frustrationSignals,
}: {
  childId: string
  attentionPattern?: string | null
  learningStyle?: string | null
  motivationTriggers?: Record<string, unknown>
  frustrationSignals?: Record<string, unknown>
}) {
  await prisma.behavioralMemory.upsert({
    where: { childId },
    update: {
      attentionPattern: attentionPattern ?? undefined,
      learningStyle: learningStyle ?? undefined,
      motivationTriggers: (motivationTriggers ?? {}) as unknown as object,
      frustrationSignals: (frustrationSignals ?? {}) as unknown as object,
      lastObserved: new Date(),
    },
    create: {
      childId,
      attentionPattern: attentionPattern ?? null,
      learningStyle: learningStyle ?? null,
      motivationTriggers: (motivationTriggers ?? {}) as unknown as object,
      frustrationSignals: (frustrationSignals ?? {}) as unknown as object,
      lastObserved: new Date(),
    },
  })
}
