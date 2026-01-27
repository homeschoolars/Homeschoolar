import "server-only"
import { generateObject } from "ai"
import { google, isGeminiConfigured } from "@/lib/google-ai"
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

  const studentProfile = {
    academic_level_by_subject: learningProfile.academicLevelBySubject,
    learning_speed: learningSpeed,
    attention_span: attentionSpan,
    interest_signals: learningProfile.interestSignals,
    strengths: learningProfile.strengths,
    gaps: learningProfile.gaps,
    age_band: ageBand,
    religion: religion === "muslim" ? "muslim" : "non_muslim",
    preferred_content_style: preferredContentStyle,
  }

  return `SYSTEM:
You are an expert curriculum designer and child psychologist. 
Your task is to generate a personalized learning roadmap for a child, age 4–13, based on their assessment profile.

INPUT:
{
  "student_profile": ${JSON.stringify(studentProfile, null, 2)},
  "subject_list": ${JSON.stringify(subjects.map(s => s.name))}
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
    throw new Error("Student or profile not found")
  }

  // Get or generate learning profile
  let learningProfile = await getStudentLearningProfile(studentId)
  if (!learningProfile) {
    // Generate learning profile first
    const profileService = await import("@/services/learning-profile-service")
    learningProfile = await profileService.generateStudentLearningProfile(studentId, userId)
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

  // Check if Gemini is configured
  if (!isGeminiConfigured()) {
    throw new Error(
      "Google Gemini API key is not configured. " +
      "Please set GOOGLE_GENERATIVE_AI_API_KEY in your environment variables. " +
      "Get your API key from: https://aistudio.google.com/apikey"
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
    result = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: roadmapSchema,
      prompt,
      maxOutputTokens: 4000,
    })
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 100) : "unknown")
    console.error(`[Roadmap] Gemini API error (${hint}):`, error)
    throw new Error(
      `Failed to generate roadmap: ${hint}. ` +
      "Please check your Gemini API key, quota, billing, and key restrictions."
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
          generatedBy: "gemini",
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
