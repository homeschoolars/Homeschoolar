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
import { holisticReportAsPromptAssessments } from "@/lib/assessment/holistic-report-as-prompt-assessments"

/**
 * OpenAI Structured Outputs reject `z.record()` JSON Schema (invalid required/additionalProperties mix).
 * Use arrays of rows with explicit `subject` / `topic`, then normalize to DB records.
 */
const academicLevelRowSchema = z.object({
  subject: z.string().describe("Exact subject name from Available Subjects in the prompt"),
  level: z.string().describe("Academic level: beginner, intermediate, or advanced"),
  confidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
  evidence: z.array(z.string()).describe("Evidence for this subject; use [] if none"),
})

const interestScoreRowSchema = z.object({
  topic: z.string().describe("Subject or interest label from input only"),
  score: z.number().min(0).max(100).describe("Interest score 0-100"),
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
  academic_levels: z
    .array(academicLevelRowSchema)
    .describe("One row per subject in Available Subjects; exact subject names"),
  learning_speed: z.enum(["slow", "average", "fast"]).describe("How quickly the student grasps new concepts"),
  attention_span: z.enum(["short", "medium", "long"]).describe("Student's typical attention span"),
  interest_scores: z
    .array(interestScoreRowSchema)
    .describe("Interest 0-100 per topic; only topics from provided subjects/interests; can be empty []"),
  strengths: z.array(strengthItemSchema).describe("Areas where the student excels"),
  gaps: z.array(gapItemSchema).describe("Areas needing improvement with priorities"),
  evidence: z.array(evidenceItemSchema).describe("Comprehensive evidence — always return an array (use [] if none)"),
  recommended_content_style: z
    .union([z.string(), z.null()])
    .describe("Recommended content delivery style; use null if unknown"),
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
1. academic_levels: ARRAY with one object per subject in "Available Subjects" (exact names)
   - Each object: { subject, level, confidence 0-100, evidence: string[] (can be []) }
   - Base ONLY on provided assessment data
   - If no assessment for a subject, set confidence to 0 and evidence to []
2. Learning speed: "slow" | "average" | "fast"
   - Base on assessment completion patterns, learning memory progression, or behavioral memory
   - If no data, default to "average"
3. Attention span: "short" | "medium" | "long"
   - Base on behavioral memory attentionPattern if available
   - If not available, infer from age band (4-7: typically short/medium, 8-13: typically medium/long)
4. interest_scores: ARRAY of { topic, score 0-100 }
   - ONLY use subjects from "Available Subjects" or topics from "Interests"
   - Base on provided interests and assessment performance; can be empty []
5. Strengths: Array of {area, evidence}
   - Base ONLY on assessment strengths and learning memory
   - Each strength must have evidence from provided data
6. Gaps: Array of {area, priority (low/medium/high), evidence}
   - Base ONLY on assessment weaknesses and learning memory
   - Priority based on impact on learning progression
7. Evidence: Array of evidence items
   - MUST always be present (can be empty [])
   - Each item must reference provided assessment or memory data
8. Recommended content style: string or JSON null
   - Base on learning style from behavioral memory or infer from patterns; use null if unknown

VALIDATION CHECKLIST (VERIFY BEFORE OUTPUT):
✓ All required top-level keys present (including recommended_content_style, use null if unknown)
✓ student_summary: non-empty string (2-3 sentences)
✓ learning_speed: exactly "slow", "average", or "fast"
✓ attention_span: exactly "short", "medium", or "long"
✓ academic_levels: array with one row per "Available Subjects" name; each row has subject, level, confidence, evidence[]
✓ interest_scores: array of {topic, score}; topics from subjects/interests only
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
      assessmentReports: {
        orderBy: { createdAt: "desc" },
        take: 1,
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

  // Backend validation: per-subject completed rows OR holistic AssessmentReport (parent quiz / AI holistic)
  const completedAssessments = student.assessments.filter((a) => a.status === "completed")
  const latestHolistic = student.assessmentReports[0] ?? null
  if (completedAssessments.length === 0 && !latestHolistic) {
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

  // Prepare assessment data (per-subject table and/or holistic report)
  const assessments =
    completedAssessments.length > 0
      ? completedAssessments.map((a) => ({
          subject: a.subject?.name ?? "Unknown",
          score: a.score,
          strengths: a.assessmentResult?.strengths,
          weaknesses: a.assessmentResult?.weaknesses,
        }))
      : latestHolistic
        ? holisticReportAsPromptAssessments(latestHolistic)
        : []

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

  const evidence = result.object.evidence ?? []

  const normalizedAcademicLevels: Record<string, { level: string; confidence: number; evidence: string[] }> = {}
  for (const row of result.object.academic_levels) {
    if (!row.subject?.trim()) continue
    normalizedAcademicLevels[row.subject] = {
      level: row.level,
      confidence: row.confidence,
      evidence: Array.isArray(row.evidence) ? row.evidence : [],
    }
  }

  const interestSignals: Record<string, number> = {}
  for (const row of result.object.interest_scores) {
    if (!row.topic?.trim()) continue
    interestSignals[row.topic] = row.score
  }

  // Save or update learning profile
  const profile = await prisma.studentLearningProfile.upsert({
    where: { studentId },
    update: {
      academicLevelBySubject: normalizedAcademicLevels as unknown as object,
      learningSpeed: result.object.learning_speed,
      attentionSpan: result.object.attention_span,
      interestSignals: interestSignals as unknown as object,
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
      interestSignals: interestSignals as unknown as object,
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
