import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const insightsSchema = z.object({
  timeline: z.array(z.object({ date: z.string(), summary: z.string() })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.object({ title: z.string(), reason: z.string() })),
  learning_style_summary: z.string(),
  weekly_summary: z.object({
    mastered: z.array(z.string()),
    improving: z.array(z.string()),
    needs_attention: z.array(z.string()),
    try_this_activity: z.string().optional(),
    review_concept: z.string().optional(),
    celebrate: z.string().optional(),
    next_week_preview: z.string().optional(),
  }),
})

/** Parent Insight Dashboard template: no jargon, positive framing, 3–5 bullet points, actionable. */
const PARENT_INSIGHT_PROMPT = `You generate WEEKLY SUMMARY reports for parents. Rules:
- No educational jargon. Use simple, parent-friendly language.
- Positive framing. Focus on growth and specific next steps.
- 3–5 bullet points max per section.
- Be specific and actionable.

Sections to fill:
1. mastered: 2–3 concepts the child has mastered (brief labels).
2. improving: 1–2 areas with consistent progress.
3. needs_attention: 1–2 specific, actionable areas (e.g. "subtraction with borrowing" not "math").
4. try_this_activity: One simple home activity (1 sentence).
5. review_concept: One concept to briefly review (1 sentence).
6. celebrate: One specific achievement to celebrate (1 sentence).
7. next_week_preview: What focus will be next (1 sentence).

Also return: timeline (recent dates + short summary), strengths, weaknesses, recommendations (title + reason), learning_style_summary.`

export async function getChildInsights(childId: string) {
  const child = await prisma.child.findUnique({ where: { id: childId }, select: { parentId: true } })
  if (child?.parentId) {
    await enforceSubscriptionAccess({ userId: child.parentId, feature: "ai" })
  }
  const assessments = await prisma.assessment.findMany({
    where: { childId },
    include: { assessmentResult: true, subject: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  const memories = await prisma.learningMemory.findMany({ where: { childId } })
  const recommendations = await prisma.aIRecommendation.findMany({ where: { childId }, take: 5 })

  const prompt = `${PARENT_INSIGHT_PROMPT}

Assessments: ${JSON.stringify(assessments)}
Learning memory: ${JSON.stringify(memories)}
Recommendations: ${JSON.stringify(recommendations)}

Return timeline, strengths, weaknesses, recommendations with reasons, learning_style_summary, and weekly_summary (mastered, improving, needs_attention, try_this_activity, review_concept, celebrate, next_week_preview).`

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: insightsSchema,
    prompt,
    maxTokens: 1800,
  })

  await prisma.analyticsEvent.create({
    data: {
      childId,
      eventType: "insights.generated",
      eventData: result.object as unknown as object,
    },
  })

  return result.object
}

export async function getMemorySummary(childId: string) {
  const learning = await prisma.learningMemory.findMany({ where: { childId } })
  const behavioral = await prisma.behavioralMemory.findUnique({ where: { childId } })

  return {
    learning,
    behavioral,
  }
}

export async function getChildRecommendations(childId: string) {
  const recommendations = await prisma.aIRecommendation.findMany({
    where: { childId, isDismissed: false },
    orderBy: { priority: "desc" },
  })
  return recommendations
}
