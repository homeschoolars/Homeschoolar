import "server-only"
import { generateObject } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { getStudentLearningProfile } from "@/services/learning-profile-service"

const roadmapSubjectSchema = z.object({
  entry_level: z.enum(["Foundation", "Bridge", "Advanced"]),
  weekly_lessons: z.number().min(3).max(7),
  teaching_style: z.enum(["story", "visual", "logic", "mix"]),
  difficulty_progression: z.enum(["linear", "adaptive", "intensive"]),
  ai_adaptation_strategy: z.string(),
  estimated_mastery_weeks: z.number().min(1).max(52),
})

const roadmapSchema = z.object({
  subjects: z.record(z.string(), roadmapSubjectSchema),
  Electives: z.record(z.string(), roadmapSubjectSchema).optional(),
}).passthrough() // Allow additional fields but validate known ones

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

  return `SYSTEM:
You are an expert curriculum designer and child psychologist. 
Your task is to generate a personalized learning roadmap for a child, age 4–13, based on their assessment profile.

INPUT:
{
  "student_profile": ${studentProfileJson},
  "subject_list": ${subjectListJson}
}

TASK:
1. Generate a roadmap for each subject in subject_list.
2. Suggest electives only if age_band = 8-13.
3. Adapt teaching style based on preferred_content_style.
4. Reduce cognitive load on weak areas.
5. Emphasize subjects aligned with interest_signals.

OUTPUT FORMAT (strict JSON):
{
  "Language & Communication Arts": {
    "entry_level": "Foundation | Bridge | Advanced",
    "weekly_lessons": 3-7,
    "teaching_style": "story | visual | logic | mix",
    "difficulty_progression": "linear | adaptive | intensive",
    "ai_adaptation_strategy": "...",
    "estimated_mastery_weeks": number
  },
  "Mathematical Thinking & Logic": {...},
  "...": {...},
  ${ageBand === "8-13" ? `"Electives": {
    ${electiveSubjects.map(s => `"${s.name}": {...}`).join(",\n    ")}
  }` : ""}
}

Always generate JSON, no free text.

Include all mandatory subjects.

Include electives only if age ≥ 8.

Make it age-appropriate and interest-adaptive.`
}

export async function generateLearningRoadmap(
  studentId: string,
  userId: string
) {
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  const student = await prisma.child.findUnique({
    where: { id: studentId },
    include: {
      profile: true,
      interestsV2: true,
    },
  })

  if (!student || !student.profile) {
    throw new Error("Student or profile not found. Please ensure the student profile is complete.")
  }

  // Check if student has completed assessment
  const hasCompletedAssessment = student.assessmentCompleted
  if (!hasCompletedAssessment) {
    throw new Error(
      "Assessment not completed. " +
      "Please complete the initial assessment for this student before generating a roadmap."
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

  const prompt = buildRoadmapPrompt({
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

  let result
  try {
    // Log prompt length for debugging (without exposing sensitive data)
    console.log(`[Roadmap] Generating roadmap for student ${studentId}, prompt length: ${prompt.length} chars`)
    
    result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: roadmapSchema,
      prompt,
      maxTokens: 4000,
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

  // Save or update roadmap
  const existing = await prisma.learningRoadmap.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  })

  const roadmap = existing
    ? await prisma.learningRoadmap.update({
        where: { id: existing.id },
        data: {
          roadmapJson: result.object as unknown as object,
          lastUpdated: new Date(),
        },
      })
    : await prisma.learningRoadmap.create({
        data: {
          studentId,
          roadmapJson: result.object as unknown as object,
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
