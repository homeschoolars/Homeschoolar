import "server-only"
import { generateObject } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { z } from "zod"
import { withRetry } from "@/lib/openai-retry"

/**
 * Parent-Friendly Summary Schema
 * Translates diagnostic profile into supportive, parent-friendly insights
 * WITHOUT grades, marks, or judgmental language
 */
const parentSummarySchema = z.object({
  overview: z.string().describe("Brief overview of the assessment (2-3 sentences, supportive)"),
  learning_strengths: z.array(z.string()).describe("Areas where child shows strong understanding (framed positively)"),
  learning_opportunities: z.array(z.string()).describe("Areas where child can grow (framed as opportunities, not weaknesses)"),
  learning_style: z.string().describe("How child learns best (1-2 sentences)"),
  recommended_approach: z.string().describe("Recommended learning approach for this child (2-3 sentences)"),
  next_steps: z.array(z.string()).describe("What to focus on next (3-5 items)"),
  encouragement: z.string().describe("Encouraging message for parent and child (1-2 sentences)"),
})

/**
 * Generate parent-friendly summary from diagnostic profile
 * 
 * Translates technical diagnostic insights into supportive, parent-friendly language
 * Focuses on understanding and growth, not performance or grades
 */
export async function generateParentFriendlySummary(diagnosticProfile: {
  child_profile: {
    estimated_age_band: string
    cognitive_level_fit: string
    learning_style_signals: string[]
  }
  concept_mastery: Array<{
    topic: string
    mastery_level: string
    confidence_estimate: number
    evidence: string
  }>
  strength_zones: string[]
  weakness_zones: string[]
  misconception_patterns: Array<{
    pattern: string
    likely_cause: string
    recommended_intervention: string
  }>
  difficulty_baseline_recommendation: string
  priority_learning_areas: string[]
  content_format_recommendation: string[]
  personalization_notes: string
  progress_benchmark_summary: string
}) {
  if (!isOpenAIConfigured()) {
    // Fallback summary without AI
    return {
      overview: "We've learned about your child's learning style and created a personalized learning path.",
      learning_strengths: diagnosticProfile.strength_zones.slice(0, 3),
      learning_opportunities: diagnosticProfile.weakness_zones.slice(0, 3).map(w => `Would benefit from more practice with ${w}`),
      learning_style: `Your child learns best through ${diagnosticProfile.content_format_recommendation.join(" and ")} content.`,
      recommended_approach: diagnosticProfile.personalization_notes,
      next_steps: diagnosticProfile.priority_learning_areas.slice(0, 5),
      encouragement: "Every child learns at their own pace. This personalized path will help your child learn in the way that works best for them!",
    }
  }

  const prompt = `Translate this diagnostic learning profile into a supportive, parent-friendly summary.

CRITICAL RULES:
- NEVER mention grades, scores, marks, pass/fail, or test performance
- NEVER use judgmental or negative language
- ALWAYS frame insights as learning opportunities and growth
- Use supportive, encouraging, scientific tone
- Focus on understanding and personalization, not evaluation

DIAGNOSTIC PROFILE:
${JSON.stringify(diagnosticProfile, null, 2)}

TASK:
Create a parent-friendly summary that:
1. Explains what we learned about the child's learning style
2. Highlights strengths positively
3. Frames areas for growth as opportunities
4. Provides actionable next steps
5. Encourages and supports the parent

OUTPUT SCHEMA:
{
  "overview": string (2-3 sentences, supportive overview),
  "learning_strengths": array of strings (areas of strength, framed positively),
  "learning_opportunities": array of strings (areas for growth, framed as opportunities),
  "learning_style": string (1-2 sentences about how child learns best),
  "recommended_approach": string (2-3 sentences with recommended learning approach),
  "next_steps": array of strings (3-5 actionable next steps),
  "encouragement": string (1-2 sentences, encouraging message)
}

TONE: Supportive, neutral, encouraging, scientific, child-safe. Output must be valid JSON.`

  try {
    const result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: parentSummarySchema,
          prompt,
        }),
      {
        maxRetries: 3,
        retryDelay: 1000,
      }
    )

    return result.object
  } catch (error) {
    console.error("[Parent Summary] Error generating summary:", error)
    // Return fallback summary
    return {
      overview: "We've learned about your child's learning style and created a personalized learning path.",
      learning_strengths: diagnosticProfile.strength_zones.slice(0, 3),
      learning_opportunities: diagnosticProfile.weakness_zones.slice(0, 3).map(w => `Would benefit from more practice with ${w}`),
      learning_style: `Your child learns best through ${diagnosticProfile.content_format_recommendation.join(" and ")} content.`,
      recommended_approach: diagnosticProfile.personalization_notes,
      next_steps: diagnosticProfile.priority_learning_areas.slice(0, 5),
      encouragement: "Every child learns at their own pace. This personalized path will help your child learn in the way that works best for them!",
    }
  }
}
