import "server-only"
import { generateObject } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { STATIC_PROFILE_SYSTEM_PROMPT } from "@/lib/static-prompts"
import { hashStudentData, shouldRegenerateProfile, TOKEN_LIMITS } from "@/lib/openai-cache"
import { withRetry, isSchemaValidationError, isRateLimitError } from "@/lib/openai-retry"

/**
 * Production-safe JSON Schema for OpenAI Structured Outputs
 * 
 * Schema Rules:
 * - All required fields are explicitly defined at object level
 * - evidence is always present (never optional) to satisfy OpenAI validation
 * - additionalProperties is handled correctly by Zod's record types
 * - No nested required arrays that cause validation errors
 */
/**
 * Academic level item schema - all fields are required
 * OpenAI Structured Outputs requires all properties to be in the 'required' array
 * when using additionalProperties patterns
 */
const academicLevelItemSchema = z.object({
  level: z.string().describe("Academic level: beginner, intermediate, or advanced"),
  confidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
  evidence: z.array(z.string()).describe("Evidence items supporting this level assessment - always include, can be empty array"),
})

const strengthItemSchema = z.object({
  area: z.string().describe("Subject or skill area where student excels"),
  evidence: z.string().describe("Specific evidence of strength"),
})

const gapItemSchema = z.object({
  area: z.string().describe("Subject or skill area needing improvement"),
  priority: z.enum(["low", "medium", "high"]).describe("Priority level for addressing this gap"),
  evidence: z.string().describe("Specific evidence of the gap"),
})

const evidenceItemSchema = z.object({
  subject: z.string().describe("Subject name this evidence relates to"),
  source: z.enum(["assessment", "observation", "parent_input", "worksheet", "quiz"]).describe("Source of the evidence"),
  confidence: z.number().min(0).max(1).describe("Confidence score between 0 and 1"),
  description: z.string().describe("Description of the evidence"),
})

const studentLearningProfileSchema = z.object({
  student_summary: z.string().describe("Brief summary of the student's overall learning profile"),
  academic_level_by_subject: z.record(z.string(), academicLevelItemSchema).describe("Academic level for each subject"),
  learning_speed: z.enum(["slow", "average", "fast"]).describe("How quickly the student grasps new concepts"),
  attention_span: z.enum(["short", "medium", "long"]).describe("Student's typical attention span"),
  interest_signals: z.record(z.string(), z.number().min(0).max(100)).describe("Interest level scores (0-100) for each subject/topic"),
  strengths: z.array(strengthItemSchema).describe("Areas where the student excels"),
  gaps: z.array(gapItemSchema).describe("Areas needing improvement with priorities"),
  evidence: z.array(evidenceItemSchema).default([]).describe("Comprehensive evidence array - always present, can be empty"),
  recommended_content_style: z.string().optional().describe("Recommended content delivery style (e.g., visual-heavy, story-based)"),
})

function buildLearningProfilePrompt({
  childName,
  age,
  ageBand,
  religion,
  interests,
  assessments,
  learningMemory,
  behavioralMemory,
  subjects,
}: {
  childName: string
  age: number
  ageBand: "4-7" | "8-13"
  religion: "muslim" | "non_muslim"
  interests: string[]
  assessments: Array<{
    subject: string
    score?: number | null
    strengths?: unknown
    weaknesses?: unknown
  }>
  learningMemory: Array<{
    subject: string
    concept: string
    masteryLevel: number
  }>
  behavioralMemory?: {
    attentionPattern?: string | null
    learningStyle?: string | null
  } | null
  subjects: Array<{ name: string }>
}) {
  // Build dynamic user content (non-cached)
  const dynamicContent = `Generate a comprehensive Student Learning Profile for ${childName} (age ${age}, age band ${ageBand}, ${religion}).

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT DATA (USE ONLY THIS DATA - DO NOT INVENT):
- Student Name: ${childName}
- Age: ${age}
- Age Band: ${ageBand}
- Religion: ${religion}
- Interests: ${interests.length > 0 ? interests.join(", ") : "None specified"}
- Available Subjects: ${subjects.map(s => s.name).join(", ")}

ASSESSMENT DATA:
${assessments.length > 0 ? assessments.map((a, i) => `
Assessment ${i + 1}:
- Subject: ${a.subject || "Unknown"}
- Score: ${a.score !== null && a.score !== undefined ? a.score : "Not available"}
- Strengths: ${a.strengths ? JSON.stringify(a.strengths) : "None"}
- Weaknesses: ${a.weaknesses ? JSON.stringify(a.weaknesses) : "None"}
`).join("\n") : "No assessment data available"}

LEARNING MEMORY:
${learningMemory.length > 0 ? learningMemory.map((m, i) => `
Memory ${i + 1}: ${m.subject} - ${m.concept} (Mastery: ${m.masteryLevel}%)
`).join("\n") : "No learning memory data"}

BEHAVIORAL MEMORY:
${behavioralMemory ? `
- Attention Pattern: ${behavioralMemory.attentionPattern || "Not assessed"}
- Learning Style: ${behavioralMemory.learningStyle || "Not assessed"}
` : "No behavioral memory data"}

STRICT OUTPUT REQUIREMENTS:
1. Academic level by subject: For each subject in "Available Subjects", determine level (beginner/intermediate/advanced) with confidence (0-100)
   - Base ONLY on provided assessment data
   - If no assessment for a subject, set confidence to 0 and evidence to []
   - Evidence array must always be present (can be empty [])
2. Learning speed: "slow" | "average" | "fast"
   - Base on assessment completion patterns, learning memory progression, or behavioral memory
   - If no data, default to "average"
3. Attention span: "short" | "medium" | "long"
   - Base on behavioral memory attentionPattern if available
   - If not available, infer from age band (4-7: typically short/medium, 8-13: typically medium/long)
4. Interest signals: Object with subject/topic keys and scores (0-100)
   - ONLY use subjects from "Available Subjects" or topics from "Interests"
   - Base on provided interests and assessment performance
5. Strengths: Array of {area, evidence}
   - Base ONLY on assessment strengths and learning memory
   - Each strength must have evidence from provided data
6. Gaps: Array of {area, priority (low/medium/high), evidence}
   - Base ONLY on assessment weaknesses and learning memory
   - Priority based on impact on learning progression
7. Evidence: Array of evidence items
   - MUST always be present (can be empty [])
   - Each item must reference provided assessment or memory data
8. Recommended content style: Optional string
   - Base on learning style from behavioral memory or infer from patterns

VALIDATION CHECKLIST (VERIFY BEFORE OUTPUT):
✓ All required top-level keys present
✓ student_summary: non-empty string (2-3 sentences)
✓ learning_speed: exactly "slow", "average", or "fast"
✓ attention_span: exactly "short", "medium", or "long"
✓ academic_level_by_subject: object with keys matching "Available Subjects" exactly
✓ Each academic_level entry has: level (string), confidence (0-100), evidence (array, can be empty)
✓ interest_signals: object with keys from provided subjects/interests only
✓ strengths: array (can be empty), items have area and evidence
✓ gaps: array (can be empty), items have area, priority (exact enum), evidence
✓ evidence: array always present (can be empty)

ANTI-HALLUCINATION RULES:
- NEVER invent subject names not in "Available Subjects"
- NEVER add assessment data not in provided assessments array
- NEVER infer learning speed/attention span beyond what's explicitly stated or age-appropriate defaults
- ONLY use provided assessment scores, strengths, weaknesses
- If assessment data missing for a subject, set confidence to 0 and evidence to []
- Interest signals ONLY for subjects/topics mentioned in interests or assessments
- All evidence must reference actual provided data

Return a structured JSON object matching the schema. Output must be valid JSON.`

  return { staticPrompt: STATIC_PROFILE_SYSTEM_PROMPT, dynamicContent }
}

export async function generateStudentLearningProfile(
  studentId: string,
  userId: string
) {
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  // Backend validation: Check if OpenAI is configured BEFORE any processing
  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key is not configured. " +
      "Please set OPENAI_API_KEY in your environment variables. " +
      "Get your API key from: https://platform.openai.com/api-keys"
    )
  }

  const student = await prisma.child.findUnique({
    where: { id: studentId },
    include: {
      profile: true,
      preferences: true,
      interestsV2: true,
      assessments: {
        include: {
          subject: true,
          assessmentResult: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      learningMemory: {
        include: { subject: true },
      },
      behavioralMemory: true,
    },
  })

  // Backend validation: Student and profile must exist
  if (!student || !student.profile) {
    throw new Error("Student or profile not found. Please ensure the student profile is complete.")
  }

  // Backend validation: Check if assessment data exists BEFORE calling OpenAI
  const completedAssessments = student.assessments.filter(a => a.status === "completed")
  if (completedAssessments.length === 0) {
    throw new Error(
      "Assessment data is missing. " +
      "Please complete at least one assessment for this student before generating a learning profile. " +
      "The learning profile requires assessment data to generate accurate academic levels and evidence."
    )
  }

  // Determine age band
  const age = student.profile.ageYears
  const ageBand: "4-7" | "8-13" = age >= 4 && age <= 7 ? "4-7" : "8-13"

  // Get all subjects
  const subjects = await prisma.subject.findMany({
    orderBy: { displayOrder: "asc" },
  })

  // Prepare assessment data
  const assessments = student.assessments.map((a) => ({
    subject: a.subject?.name ?? "Unknown",
    score: a.score,
    strengths: a.assessmentResult?.strengths,
    weaknesses: a.assessmentResult?.weaknesses,
  }))

  // Prepare learning memory data
  const learningMemory = student.learningMemory.map((m) => ({
    subject: m.subject?.name ?? "Unknown",
    concept: m.concept,
    masteryLevel: m.masteryLevel,
  }))

  // Get interests
  const interests = student.interestsV2.map((i) => i.label)

  // Check regeneration guard
  const studentDataHash = hashStudentData(studentId, {
    assessments,
    age,
    religion: student.profile.religion,
  })

  const { shouldRegenerate } = await shouldRegenerateProfile(studentId, studentDataHash)
  
  // If profile exists and data hasn't changed significantly, return existing
  if (!shouldRegenerate) {
    const existing = await getStudentLearningProfile(studentId)
    if (existing) {
      console.log(`[Learning Profile] Using cached profile for student ${studentId} (data unchanged)`)
      return existing
    }
  }

  const { staticPrompt, dynamicContent } = buildLearningProfilePrompt({
    childName: student.name,
    age,
    ageBand,
    religion: student.profile.religion,
    interests,
    assessments,
    learningMemory,
    behavioralMemory: student.behavioralMemory,
    subjects,
  })

  const fullPrompt = `${staticPrompt}\n\n${dynamicContent}`

  let result
  try {
    result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: studentLearningProfileSchema,
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
    
    console.error(`[Learning Profile] OpenAI API error for student ${studentId}:`, {
      status: err?.status,
      code: err?.code,
      message: err?.message,
      hint,
      error: String(error),
      isSchemaError: isSchemaValidationError(error),
      isRateLimit: isRateLimitError(error),
    })
    
    // Provide specific error messages
    if (isSchemaValidationError(error)) {
      throw new Error(
        `Invalid JSON schema for learning profile (400 Bad Request). ` +
        `This indicates a schema validation issue. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    if (isRateLimitError(error)) {
      throw new Error(
        `OpenAI rate limit exceeded (429 Too Many Requests). ` +
        `Please wait a moment and try again. ` +
        `If this persists, check your OpenAI quota and billing.`
      )
    }
    
    if (err?.status === 400) {
      throw new Error(
        `Invalid schema or prompt format (400 Bad Request). ` +
        `Error: ${hint}. ` +
        `Please check server logs for details. This may indicate a schema validation issue.`
      )
    }
    
    throw new Error(
      `Failed to generate learning profile: ${hint}. ` +
      "Please check your OpenAI API key, quota, billing, and key restrictions."
    )
  }

  // Ensure evidence array exists (default to empty if not provided)
  // Also ensure evidence exists in each academic_level_by_subject item
  const evidence = result.object.evidence ?? []
  
  // Normalize academic_level_by_subject to ensure evidence arrays exist
  const normalizedAcademicLevels: Record<string, { level: string; confidence: number; evidence: string[] }> = {}
  for (const [subject, data] of Object.entries(result.object.academic_level_by_subject)) {
    normalizedAcademicLevels[subject] = {
      level: data.level,
      confidence: data.confidence,
      evidence: Array.isArray(data.evidence) ? data.evidence : [],
    }
  }

  // Save or update learning profile
  const profile = await prisma.studentLearningProfile.upsert({
    where: { studentId },
    update: {
      academicLevelBySubject: normalizedAcademicLevels as unknown as object,
      learningSpeed: result.object.learning_speed,
      attentionSpan: result.object.attention_span,
      interestSignals: result.object.interest_signals as unknown as object,
      strengths: result.object.strengths as unknown as object,
      gaps: result.object.gaps as unknown as object,
      recommendedContentStyle: result.object.recommended_content_style ?? null,
      generatedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      studentId,
      academicLevelBySubject: normalizedAcademicLevels as unknown as object,
      learningSpeed: result.object.learning_speed,
      attentionSpan: result.object.attention_span,
      interestSignals: result.object.interest_signals as unknown as object,
      strengths: result.object.strengths as unknown as object,
      gaps: result.object.gaps as unknown as object,
      recommendedContentStyle: result.object.recommended_content_style ?? null,
      generatedAt: new Date(),
    },
  })

  return profile
}

export async function getStudentLearningProfile(studentId: string) {
  return prisma.studentLearningProfile.findUnique({
    where: { studentId },
  })
}
