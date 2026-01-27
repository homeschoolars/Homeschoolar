import "server-only"
import { generateObject } from "ai"
import { google } from "@/lib/google-ai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { getStudentLearningProfile } from "@/services/learning-profile-service"

const roadmapSubjectSchema = z.object({
  entry_level: z.string(),
  weekly_lessons: z.number().min(1).max(10),
  teaching_style: z.string(),
  difficulty_progression: z.array(z.string()),
  ai_adaptation_strategy: z.string(),
  mastery_timeline_weeks: z.number().min(1).max(52),
})

const roadmapSchema = z.object({
  subjects: z.record(z.string(), roadmapSubjectSchema),
  summary: z.string().optional(),
})

function buildRoadmapPrompt({
  studentName,
  age,
  ageBand,
  religion,
  interests,
  learningProfile,
  subjects,
}: {
  studentName: string
  age: number
  ageBand: "4-7" | "8-13"
  religion: "muslim" | "non_muslim"
  interests: string[]
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
}) {
  return `You are an expert curriculum designer and child psychologist.

Generate a personalized learning roadmap for ${studentName}.

INPUT:
- Student Learning Profile: ${JSON.stringify(learningProfile)}
- Age: ${age}
- Age Band: ${ageBand}
- Religion: ${religion}
- Interests: ${interests.join(", ")}
- Subject List: ${subjects.map(s => s.name).join(", ")}

TASK:
Generate a personalized learning roadmap.

RULES:
- Use provided subject names only
- Adapt difficulty to attention span (${learningProfile.attentionSpan})
- Emphasize interest-aligned subjects
- Reduce cognitive load in weak areas
- Consider learning speed: ${learningProfile.learningSpeed}
- Recommended content style: ${learningProfile.recommendedContentStyle ?? "balanced"}

OUTPUT (STRICT JSON):
For each subject, provide:
{
  "subject_name": {
    "entry_level": "beginner|intermediate|advanced",
    "weekly_lessons": number (1-10),
    "teaching_style": "description of how to teach this subject",
    "difficulty_progression": ["step1", "step2", ...],
    "ai_adaptation_strategy": "how AI should adapt content",
    "mastery_timeline_weeks": number (1-52)
  }
}

Include all mandatory subjects. For ${religion === "muslim" ? "Muslim" : "non-Muslim"} students, ${religion === "muslim" ? "include" : "exclude"} Islamic Studies.
For age band 8-13, include electives.`
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

  const prompt = buildRoadmapPrompt({
    studentName: student.name,
    age,
    ageBand,
    religion: student.profile.religion,
    interests,
    learningProfile: {
      academicLevelBySubject: learningProfile.academicLevelBySubject,
      learningSpeed: learningProfile.learningSpeed,
      attentionSpan: learningProfile.attentionSpan,
      interestSignals: learningProfile.interestSignals,
      strengths: learningProfile.strengths,
      gaps: learningProfile.gaps,
      recommendedContentStyle: learningProfile.recommendedContentStyle,
    },
    subjects,
  })

  const result = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: roadmapSchema,
    prompt,
    maxOutputTokens: 4000,
  })

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
