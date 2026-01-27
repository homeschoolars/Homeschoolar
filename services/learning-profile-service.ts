import "server-only"
import { generateObject } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

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
  return `You are an expert curriculum designer and child psychologist.

Generate a comprehensive Student Learning Profile for ${childName} (age ${age}, age band ${ageBand}, ${religion}).

INPUT DATA:
- Age: ${age}
- Age Band: ${ageBand}
- Religion: ${religion}
- Interests: ${interests.join(", ")}
- Assessments: ${JSON.stringify(assessments)}
- Learning Memory: ${JSON.stringify(learningMemory)}
- Behavioral Memory: ${JSON.stringify(behavioralMemory)}
- Available Subjects: ${subjects.map(s => s.name).join(", ")}

TASK:
Create a detailed learning profile that captures:
1. Academic level by subject (beginner/intermediate/advanced with confidence scores)
2. Learning speed (how quickly they grasp new concepts)
3. Attention span (based on behavioral patterns)
4. Interest signals (which subjects/topics they show most interest in)
5. Strengths (areas where they excel)
6. Gaps (areas needing improvement, with priority levels)
7. Recommended content style (e.g., "visual-heavy", "story-based", "interactive-games")

RULES:
- Use provided subject names only
- Be specific and evidence-based
- Consider age-appropriate expectations
- Adapt to attention span patterns
- Emphasize interest-aligned subjects
- Identify learning gaps with actionable priorities

OUTPUT:
Return a structured JSON object matching the schema.

IMPORTANT SCHEMA REQUIREMENTS:
- student_summary: Provide a brief 2-3 sentence summary of the student's overall learning profile
- academic_level_by_subject: For each subject, include level, confidence (0-100), and evidence array (can be empty)
- evidence: Always include an evidence array at the top level, even if empty. Each evidence item must have:
  * subject: Subject name
  * source: One of: assessment, observation, parent_input, worksheet, quiz
  * confidence: Number between 0 and 1
  * description: Text description of the evidence
- strengths: Array of areas where student excels, each with area and evidence
- gaps: Array of areas needing improvement, each with area, priority (low/medium/high), and evidence

Ensure all required fields are present. The evidence field must always exist (can be empty array).`
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

  const prompt = buildLearningProfilePrompt({
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

  let result
  try {
    result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: studentLearningProfileSchema,
      prompt,
    })
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 200) : "unknown")
    
    console.error(`[Learning Profile] OpenAI API error for student ${studentId}:`, {
      status: err?.status,
      code: err?.code,
      message: err?.message,
      hint,
      error: String(error),
    })
    
    // Provide specific error messages
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
