import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { STATIC_INSIGHTS_SYSTEM_PROMPT } from "@/lib/static-prompts"
import { TOKEN_LIMITS } from "@/lib/openai-cache"
import { withRetry, isSchemaValidationError, isRateLimitError } from "@/lib/openai-retry"

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

type InsightPayload = z.infer<typeof insightsSchema>

const EMPTY_INSIGHTS: InsightPayload = {
  timeline: [],
  strengths: [],
  weaknesses: [],
  recommendations: [],
  learning_style_summary: "",
  weekly_summary: {
    mastered: [],
    improving: [],
    needs_attention: [],
  },
}

function isInsightPayload(value: unknown): value is InsightPayload {
  const parsed = insightsSchema.safeParse(value)
  return parsed.success
}

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

export async function getChildInsights(childId: string, options?: { refresh?: boolean }) {
  const child = await prisma.child.findUnique({ where: { id: childId }, select: { parentId: true } })
  if (child?.parentId) {
    await enforceSubscriptionAccess({ userId: child.parentId, feature: "ai" })
  }

  const shouldRefresh = options?.refresh === true
  if (!shouldRefresh) {
    const cachedEvent = await prisma.analyticsEvent.findFirst({
      where: { childId, eventType: "insights.generated" },
      orderBy: { createdAt: "desc" },
      select: { eventData: true },
    })
    if (isInsightPayload(cachedEvent?.eventData)) {
      return cachedEvent.eventData
    }
  }

  const [assessments, memories, recommendations, learningProfile, latestRoadmap] = await Promise.all([
    prisma.assessment.findMany({
      where: { childId },
      include: { assessmentResult: true, subject: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.learningMemory.findMany({ where: { childId } }),
    prisma.aIRecommendation.findMany({ where: { childId }, take: 5 }),
    prisma.studentLearningProfile.findUnique({ where: { studentId: childId } }),
    prisma.learningRoadmap.findFirst({
      where: { studentId: childId },
      orderBy: { lastUpdated: "desc" },
      select: { roadmapJson: true },
    }),
  ])

  const hasSignals =
    assessments.length > 0 ||
    memories.length > 0 ||
    recommendations.length > 0 ||
    learningProfile != null ||
    latestRoadmap != null

  if (!hasSignals) {
    return EMPTY_INSIGHTS
  }

  const profileSnippet = learningProfile
    ? {
        academicLevelBySubject: learningProfile.academicLevelBySubject,
        learningSpeed: learningProfile.learningSpeed,
        attentionSpan: learningProfile.attentionSpan,
        strengths: learningProfile.strengths,
        gaps: learningProfile.gaps,
        recommendedContentStyle: learningProfile.recommendedContentStyle,
      }
    : null

  // Build segmented prompt: static (cacheable) + dynamic (non-cached)
  const dynamicContent = `Assessments: ${JSON.stringify(assessments)}
Learning memory: ${JSON.stringify(memories)}
Stored recommendations: ${JSON.stringify(recommendations)}
Student learning profile: ${profileSnippet ? JSON.stringify(profileSnippet) : "none"}
Learning roadmap JSON: ${latestRoadmap?.roadmapJson != null ? JSON.stringify(latestRoadmap.roadmapJson) : "none"}

When formal assessment rows are empty or sparse, infer weekly insights from the learning profile and roadmap above. Keep language parent-friendly.

Return timeline, strengths, weaknesses, recommendations with reasons, learning_style_summary, and weekly_summary (mastered, improving, needs_attention, try_this_activity, review_concept, celebrate, next_week_preview).`

  const fullPrompt = `${STATIC_INSIGHTS_SYSTEM_PROMPT}\n\n${dynamicContent}`

  let result
  try {
    result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: insightsSchema,
          prompt: fullPrompt,
        }),
      {
        maxRetries: 3,
        retryDelay: 1000,
      }
    )
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 200) : "unknown")
    
    console.error(`[Insights] OpenAI API error:`, {
      status: err?.status,
      code: err?.code,
      message: err?.message,
      hint,
      childId,
      isSchemaError: isSchemaValidationError(error),
      isRateLimit: isRateLimitError(error),
    })
    
    // Do not fail the parent dashboard when AI times out or returns schema errors.
    // We fallback to the most recent cached payload if available, then to an empty shape.
    const fallback = await prisma.analyticsEvent.findFirst({
      where: { childId, eventType: "insights.generated" },
      orderBy: { createdAt: "desc" },
      select: { eventData: true },
    })
    if (isInsightPayload(fallback?.eventData)) return fallback.eventData
    if (isSchemaValidationError(error) || isRateLimitError(error)) return EMPTY_INSIGHTS
    return EMPTY_INSIGHTS
  }

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
