import "server-only"
import { generateObject } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { getStudentLearningProfile } from "@/services/learning-profile-service"
import { STATIC_ROADMAP_SYSTEM_PROMPT } from "@/lib/static-prompts"
import { segmentPrompt, hashStudentData, shouldRegenerateRoadmap, TOKEN_LIMITS } from "@/lib/openai-cache"

/**
 * Production-safe JSON Schema for OpenAI Structured Outputs - Roadmap
 * 
 * Schema Rules:
 * - All required fields are explicitly defined
 * - No optional fields in nested objects that cause validation issues
 * - additionalProperties handled correctly by Zod record types
 */
const roadmapSubjectSchema = z.object({
  entry_level: z.enum(["Foundation", "Bridge", "Advanced"]).describe("Starting level for this subject"),
  weekly_lessons: z.number().min(3).max(7).int().describe("Number of lessons per week (3-7)"),
  teaching_style: z.enum(["story", "visual", "logic", "mix"]).describe("Preferred teaching approach"),
  difficulty_progression: z.enum(["linear", "adaptive", "intensive"]).describe("How difficulty increases over time"),
  ai_adaptation_strategy: z.string().describe("Strategy for AI to adapt content based on performance"),
  estimated_mastery_weeks: z.number().min(1).max(52).int().describe("Estimated weeks to master this subject (1-52)"),
})

const roadmapItemSchema = z.object({
  subject: z.string().describe("Subject name"),
  current_level: z.string().describe("Current academic level in this subject"),
  target_level: z.string().describe("Target level to achieve"),
  recommended_activities: z.array(z.string()).describe("List of recommended learning activities"),
  estimated_duration_weeks: z.number().min(1).max(52).int().describe("Estimated duration in weeks to reach target level"),
})

const roadmapSchema = z.object({
  student_summary: z.string().describe("Brief summary of the student's learning roadmap"),
  academic_level_by_subject: z.record(z.string(), z.object({
    level: z.string(),
    confidence: z.number().min(0).max(100),
  })).describe("Current academic levels by subject"),
  learning_roadmap: z.array(roadmapItemSchema).describe("Structured roadmap items for each subject"),
  evidence: z.array(z.object({
    subject: z.string(),
    source: z.enum(["assessment", "observation", "parent_input", "worksheet", "quiz"]),
    confidence: z.number().min(0).max(1),
    description: z.string(),
  })).default([]).describe("Evidence supporting the roadmap - always present, can be empty"),
  subjects: z.record(z.string(), roadmapSubjectSchema).describe("Detailed roadmap for each mandatory subject"),
  Electives: z.record(z.string(), roadmapSubjectSchema).optional().describe("Elective subjects roadmap (only for age 8-13)"),
})

function buildRoadmapPrompt({
  age,
  ageBand,
  religion,
  learningProfile,
  subjects,
  electiveSubjects,
}: {
  age: number
  ageBand: "4-7" | "8-13"
  religion: "muslim" | "non_muslim"
  learningProfile: {
    academicLevelBySubject: unknown
    learningSpeed: string
    attentionSpan: string
    interestSignals: unknown
    strengths: unknown
    gaps: unknown
    recommendedContentStyle?: string | null
  }
  subjects: Array<{ name: string }>
  electiveSubjects: Array<{ name: string }>
}) {
  // Normalize learning speed
  const learningSpeed = learningProfile.learningSpeed === "slow" ? "slow" : learningProfile.learningSpeed === "fast" ? "fast" : "normal"
  
  // Normalize attention span
  const attentionSpan = learningProfile.attentionSpan === "short" ? "low" : learningProfile.attentionSpan === "long" ? "high" : "medium"
  
  // Normalize content style
  const preferredContentStyle = learningProfile.recommendedContentStyle 
    ? (learningProfile.recommendedContentStyle.toLowerCase().includes("story") ? "story"
      : learningProfile.recommendedContentStyle.toLowerCase().includes("visual") ? "visual"
      : learningProfile.recommendedContentStyle.toLowerCase().includes("logic") ? "logic"
      : "mix")
    : "mix"

  // Safely serialize JSON fields to avoid circular references or invalid data
  const safeSerialize = (obj: unknown): unknown => {
    try {
      if (obj === null || obj === undefined) {
        return obj
      }
      // Deep clone and validate JSON
      const serialized = JSON.parse(JSON.stringify(obj, (key, value) => {
        // Filter out functions, undefined, and symbols
        if (typeof value === 'function' || typeof value === 'undefined' || typeof value === 'symbol') {
          return null
        }
        // Handle Date objects
        if (value instanceof Date) {
          return value.toISOString()
        }
        return value
      }))
      return serialized
    } catch (error) {
      console.warn(`[Roadmap] Failed to serialize field, using fallback:`, error)
      // Return a safe fallback
      return {}
    }
  }

  // Validate and serialize learning profile data
  const academicLevelBySubject = safeSerialize(learningProfile.academicLevelBySubject) || {}
  const interestSignals = safeSerialize(learningProfile.interestSignals) || {}
  const strengths = Array.isArray(learningProfile.strengths) 
    ? safeSerialize(learningProfile.strengths) 
    : (safeSerialize(learningProfile.strengths) || [])
  const gaps = Array.isArray(learningProfile.gaps)
    ? safeSerialize(learningProfile.gaps)
    : (safeSerialize(learningProfile.gaps) || [])

  const studentProfile = {
    academic_level_by_subject: academicLevelBySubject,
    learning_speed: learningSpeed,
    attention_span: attentionSpan,
    interest_signals: interestSignals,
    strengths: strengths,
    gaps: gaps,
    age_band: ageBand,
    religion: religion === "muslim" ? "muslim" : "non_muslim",
    preferred_content_style: preferredContentStyle,
  }

  // Validate that we have subjects
  if (!subjects || subjects.length === 0) {
    throw new Error("No subjects found for roadmap generation")
  }

  // Build the prompt with proper JSON serialization
  const subjectList = subjects.map(s => s.name).filter(Boolean)
  if (subjectList.length === 0) {
    throw new Error("No valid subject names found for roadmap generation")
  }

  // Serialize the input data separately to ensure valid JSON
  let studentProfileJson: string
  let subjectListJson: string
  try {
    studentProfileJson = JSON.stringify(studentProfile, null, 2)
    subjectListJson = JSON.stringify(subjectList)
  } catch (error) {
    console.error("[Roadmap] Failed to serialize prompt data:", error)
    throw new Error("Failed to prepare roadmap generation data. Please check learning profile data.")
  }

  // Build dynamic user content (non-cached)
  const dynamicContent = `INPUT:
{
  "student_profile": ${studentProfileJson},
  "subject_list": ${subjectListJson},
  "age_band": "${ageBand}",
  "elective_subjects": ${ageBand === "8-13" ? JSON.stringify(electiveSubjects.map(s => s.name)) : "[]"}
}

TASK:
1. Generate a roadmap for each subject in subject_list.
2. Suggest electives only if age_band = 8-13.
3. Adapt teaching style based on preferred_content_style.
4. Reduce cognitive load on weak areas.
5. Emphasize subjects aligned with interest_signals.

Generate the complete roadmap following the schema requirements.`

  return { staticPrompt: STATIC_ROADMAP_SYSTEM_PROMPT, dynamicContent }
}

export async function generateLearningRoadmap(
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
      interestsV2: true,
      assessments: {
        where: { status: "completed" },
        include: {
          subject: true,
          assessmentResult: true,
        },
        take: 1, // Just need to check if any exist
      },
    },
  })

  // Backend validation: Student and profile must exist
  if (!student || !student.profile) {
    throw new Error("Student or profile not found. Please ensure the student profile is complete.")
  }

  // Backend validation: Check if assessment data exists BEFORE calling OpenAI
  // Return HTTP 400 equivalent error - do NOT call OpenAI if data is missing
  const hasCompletedAssessment = student.assessmentCompleted
  const completedAssessments = student.assessments || []
  
  if (!hasCompletedAssessment || completedAssessments.length === 0) {
    throw new Error(
      "Assessment data is missing. " +
      "Please complete at least one assessment for this student before generating a roadmap. " +
      "The roadmap generation requires assessment data to create an accurate learning path."
    )
  }

  // Get or generate learning profile
  let learningProfile = await getStudentLearningProfile(studentId)
  if (!learningProfile) {
    // Generate learning profile first (this requires assessments to exist)
    try {
      const profileService = await import("@/services/learning-profile-service")
      learningProfile = await profileService.generateStudentLearningProfile(studentId, userId)
    } catch (profileError) {
      const profileErr = profileError as Error
      throw new Error(
        `Failed to generate learning profile: ${profileErr.message}. ` +
        "Please ensure the student has completed assessments."
      )
    }
  }

  // Determine age band
  const age = student.profile.ageYears
  const ageBand: "4-7" | "8-13" = age >= 4 && age <= 7 ? "4-7" : "8-13"

  // Get subjects based on age band and religion
  const allSubjects = await prisma.subject.findMany({
    orderBy: { displayOrder: "asc" },
  })

  // Filter subjects based on spec:
  // Mandatory: All subjects except Islamic Studies (conditional) and Electives (8-13 only)
  // Conditional: Islamic Studies (Muslim only)
  // Electives: Only for 8-13
  const mandatorySubjects = allSubjects.filter((s) => {
    const name = s.name.toLowerCase()
    // Exclude Islamic Studies (conditional) and electives
    if (name.includes("islamic")) return false
    if (ageBand === "4-7") {
      // For 4-7, exclude electives
      const electives = [
        "computational",
        "robotics",
        "oratory",
        "creative",
        "visual arts",
        "environmental",
        "physics",
        "chemistry",
      ]
      return !electives.some((e) => name.includes(e))
    }
    return true
  })

  const conditionalSubjects = student.profile.religion === "muslim"
    ? allSubjects.filter((s) => s.name.toLowerCase().includes("islamic"))
    : []

  const electiveSubjects = ageBand === "8-13"
    ? allSubjects.filter((s) => {
        const name = s.name.toLowerCase()
        const electives = [
          "computational",
          "robotics",
          "oratory",
          "creative",
          "visual arts",
          "environmental",
          "physics",
          "chemistry",
        ]
        return electives.some((e) => name.includes(e))
      })
    : []

  const subjects = [...mandatorySubjects, ...conditionalSubjects, ...electiveSubjects]

  // Get interests
  const interests = student.interestsV2.map((i) => i.label)

  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key is not configured. " +
      "Please set OPENAI_API_KEY in your environment variables. " +
      "Get your API key from: https://platform.openai.com/api-keys"
    )
  }

  // Check regeneration guard: hash student data and check if regeneration is needed
  const studentDataHash = hashStudentData(studentId, {
    assessments: student.assessments,
    learningProfile: {
      academicLevelBySubject: learningProfile.academicLevelBySubject,
      learningSpeed: learningProfile.learningSpeed,
      attentionSpan: learningProfile.attentionSpan,
    },
    age,
    religion: student.profile.religion,
  })

  const { shouldRegenerate } = await shouldRegenerateRoadmap(studentId, studentDataHash)
  
  // If roadmap exists and data hasn't changed, return existing
  if (!shouldRegenerate) {
    const existing = await prisma.learningRoadmap.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    })
    if (existing) {
      console.log(`[Roadmap] Using cached roadmap for student ${studentId} (data unchanged)`)
      return existing
    }
  }

  const { staticPrompt, dynamicContent } = buildRoadmapPrompt({
    age,
    ageBand,
    religion: student.profile.religion,
    learningProfile: {
      academicLevelBySubject: learningProfile.academicLevelBySubject,
      learningSpeed: learningProfile.learningSpeed,
      attentionSpan: learningProfile.attentionSpan,
      interestSignals: learningProfile.interestSignals,
      strengths: learningProfile.strengths,
      gaps: learningProfile.gaps,
      recommendedContentStyle: learningProfile.recommendedContentStyle,
    },
    subjects: mandatorySubjects.concat(conditionalSubjects),
    electiveSubjects,
  })

  // Use segmented prompt with messages format for potential caching
  // Note: AI SDK's generateObject doesn't directly support OpenAI cache, but we structure for future use
  const fullPrompt = `${staticPrompt}\n\n${dynamicContent}`

  let result
  try {
    // Log prompt length for debugging (without exposing sensitive data)
    console.log(`[Roadmap] Generating roadmap for student ${studentId}, prompt length: ${fullPrompt.length} chars`)
    
    result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: roadmapSchema,
      prompt: fullPrompt,
    })
    
    console.log(`[Roadmap] Successfully generated roadmap for student ${studentId}`)
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string; cause?: unknown }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 200) : "unknown")
    
    // Log full error for debugging
    console.error(`[Roadmap] OpenAI API error for student ${studentId}:`, {
      status: err?.status,
      code: err?.code,
      message: err?.message,
      hint,
      error: String(error),
    })
    
    // Provide more specific error messages
    if (err?.status === 400) {
      throw new Error(
        `Invalid request to OpenAI API (400 Bad Request). ` +
        `This usually means the prompt format is invalid or the schema doesn't match. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    throw new Error(
      `Failed to generate roadmap: ${hint}. ` +
      "Please check your OpenAI API key, quota, billing, and key restrictions."
    )
  }

  // Ensure evidence array exists (default to empty if not provided)
  const roadmapData = {
    ...result.object,
    evidence: result.object.evidence ?? [],
  }

  // Save or update roadmap
  const existing = await prisma.learningRoadmap.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  })

  const roadmap = existing
    ? await prisma.learningRoadmap.update({
        where: { id: existing.id },
        data: {
          roadmapJson: roadmapData as unknown as object,
          lastUpdated: new Date(),
        },
      })
    : await prisma.learningRoadmap.create({
        data: {
          studentId,
          roadmapJson: roadmapData as unknown as object,
          generatedBy: "openai",
        },
      })

  return roadmap
}

export async function getLearningRoadmap(studentId: string) {
  return prisma.learningRoadmap.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  })
}
