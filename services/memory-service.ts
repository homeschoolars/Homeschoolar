import { prisma } from "@/lib/prisma"

export async function updateLearningMemoryFromAssessment({
  childId,
  subjectId,
  strengths,
  weaknesses,
}: {
  childId: string
  subjectId: string
  strengths: Array<{ concept: string; evidence?: string }>
  weaknesses: Array<{ concept: string; evidence?: string }>
}) {
  const now = new Date()

  for (const item of strengths) {
    await prisma.learningMemory.upsert({
      where: {
        childId_subjectId_concept: {
          childId,
          subjectId,
          concept: item.concept,
        },
      },
      update: {
        masteryLevel: 80,
        lastUpdated: now,
        evidence: { latest: item.evidence ?? "Strength observed" } as unknown as object,
      },
      create: {
        childId,
        subjectId,
        concept: item.concept,
        masteryLevel: 80,
        lastUpdated: now,
        evidence: { latest: item.evidence ?? "Strength observed" } as unknown as object,
      },
    })
  }

  for (const item of weaknesses) {
    await prisma.learningMemory.upsert({
      where: {
        childId_subjectId_concept: {
          childId,
          subjectId,
          concept: item.concept,
        },
      },
      update: {
        masteryLevel: 30,
        lastUpdated: now,
        evidence: { latest: item.evidence ?? "Needs practice" } as unknown as object,
      },
      create: {
        childId,
        subjectId,
        concept: item.concept,
        masteryLevel: 30,
        lastUpdated: now,
        evidence: { latest: item.evidence ?? "Needs practice" } as unknown as object,
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
