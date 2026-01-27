import "server-only"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"

/**
 * OpenAI Cost Optimization Utilities
 * 
 * Implements prompt caching, regeneration guards, and token limits
 * to minimize API costs while maintaining quality.
 */

/**
 * Generate SHA-256 hash of assessment data for regeneration guards
 */
export function hashAssessmentData(data: unknown): string {
  const jsonString = JSON.stringify(data, Object.keys(data as object).sort())
  return createHash("sha256").update(jsonString).digest("hex")
}

/**
 * Generate hash of student-specific data for roadmap/profile regeneration
 */
export function hashStudentData(studentId: string, data: {
  assessments?: unknown
  learningProfile?: unknown
  age?: number
  religion?: string
}): string {
  const normalized = {
    studentId,
    age: data.age,
    religion: data.religion,
    assessments: data.assessments ? JSON.stringify(data.assessments, Object.keys(data.assessments as object).sort()) : null,
    learningProfile: data.learningProfile ? JSON.stringify(data.learningProfile, Object.keys(data.learningProfile as object).sort()) : null,
  }
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
}

/**
 * Check if roadmap should be regenerated based on data hash
 */
export async function shouldRegenerateRoadmap(
  studentId: string,
  currentDataHash: string
): Promise<{ shouldRegenerate: boolean; existingHash?: string }> {
  const existing = await prisma.learningRoadmap.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    select: { id: true, roadmapJson: true, lastUpdated: true },
  })

  if (!existing) {
    return { shouldRegenerate: true }
  }

  // Check if stored hash matches (we'll store hash in a metadata field or separate table)
  // For now, we'll check if the roadmap is older than 7 days or if data hash changed
  const daysSinceUpdate = (Date.now() - existing.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  
  // If roadmap is older than 7 days, regenerate
  if (daysSinceUpdate > 7) {
    return { shouldRegenerate: true, existingHash: undefined }
  }

  // TODO: Store data hash in roadmap metadata to compare
  // For now, always allow regeneration if explicitly requested
  return { shouldRegenerate: true, existingHash: undefined }
}

/**
 * Check if learning profile should be regenerated
 */
export async function shouldRegenerateProfile(
  studentId: string,
  currentDataHash: string
): Promise<{ shouldRegenerate: boolean; existingHash?: string }> {
  const existing = await prisma.studentLearningProfile.findUnique({
    where: { studentId },
    select: { id: true, generatedAt: true, updatedAt: true },
  })

  if (!existing) {
    return { shouldRegenerate: true }
  }

  const daysSinceUpdate = (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  
  // If profile is older than 14 days, regenerate
  if (daysSinceUpdate > 14) {
    return { shouldRegenerate: true }
  }

  return { shouldRegenerate: false, existingHash: undefined }
}

/**
 * Prompt segmentation: Split into static (cacheable) and dynamic (non-cached) parts
 */
export interface SegmentedPrompt {
  staticSystemPrompt: string
  dynamicUserContent: string
  cacheKey?: string
}

/**
 * Create segmented prompt for OpenAI caching
 * Static prompts are cached, dynamic data is not
 */
export function segmentPrompt(
  staticInstructions: string,
  dynamicData: string | object
): SegmentedPrompt {
  const dynamicContent = typeof dynamicData === "string" 
    ? dynamicData 
    : JSON.stringify(dynamicData, null, 2)

  return {
    staticSystemPrompt: staticInstructions,
    dynamicUserContent: dynamicContent,
    cacheKey: createHash("sha256").update(staticInstructions).digest("hex").slice(0, 16),
  }
}

/**
 * Token limits for different content types
 * Based on gpt-4o-mini pricing: $0.15/$0.60 per 1M tokens (input/output)
 */
export const TOKEN_LIMITS = {
  roadmap: {
    maxOutputTokens: 2000, // ~1500 words, sufficient for structured roadmap
    estimatedInputTokens: 1500, // Static prompt + student data
  },
  learningProfile: {
    maxOutputTokens: 1500, // ~1100 words
    estimatedInputTokens: 1200,
  },
  worksheet: {
    maxOutputTokens: 1200, // ~900 words for questions + answers
    estimatedInputTokens: 800,
  },
  quiz: {
    maxOutputTokens: 1000, // ~750 words for 10-15 questions
    estimatedInputTokens: 600,
  },
  insights: {
    maxOutputTokens: 800, // ~600 words for weekly insights
    estimatedInputTokens: 500,
  },
  news: {
    maxOutputTokens: 600, // ~450 words for 3-5 news items
    estimatedInputTokens: 400,
  },
} as const

/**
 * Cost estimation helpers
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: "gpt-4o-mini" = "gpt-4o-mini"
): number {
  // gpt-4o-mini pricing (as of 2024): $0.15 per 1M input tokens, $0.60 per 1M output tokens
  const INPUT_COST_PER_MILLION = 0.15
  const OUTPUT_COST_PER_MILLION = 0.60

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION

  return inputCost + outputCost
}

/**
 * Calculate cost savings from prompt caching
 * Assumes 70% of tokens are in static prompt (cacheable)
 */
export function calculateCacheSavings(totalTokens: number, cacheHitRate: number = 0.7): {
  savedTokens: number
  savedCost: number
} {
  const staticTokens = Math.floor(totalTokens * 0.7) // 70% static, 30% dynamic
  const savedTokens = Math.floor(staticTokens * cacheHitRate)
  const savedCost = estimateCost(savedTokens, 0) // Only input tokens saved

  return { savedTokens, savedCost }
}
