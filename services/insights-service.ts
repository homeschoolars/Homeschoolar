import { z } from "zod"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { prisma } from "@/lib/prisma"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const insightsSchema = z.object({
  timeline: z.array(z.object({ date: z.string(), summary: z.string() })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.object({ title: z.string(), reason: z.string() })),
  learning_style_summary: z.string(),
})

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

  const prompt = `Summarize child learning progress for parents.
Assessments: ${JSON.stringify(assessments)}
Learning memory: ${JSON.stringify(memories)}
Recommendations: ${JSON.stringify(recommendations)}
Return timeline, strengths, weaknesses, recommendations with reasons, and learning_style_summary.`

  const result = await generateObject({
    model: google("gemini-1.5-flash"),
    schema: insightsSchema,
    prompt,
    maxOutputTokens: 1200,
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
