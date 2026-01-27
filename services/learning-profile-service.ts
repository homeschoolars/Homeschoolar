import "server-only"
import { generateObject } from "ai"
import { google } from "@/lib/google-ai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const studentLearningProfileSchema = z.object({
  academic_level_by_subject: z.record(z.string(), z.object({
    level: z.string(),
    confidence: z.number().min(0).max(100),
    evidence: z.array(z.string()).optional(),
  })),
  learning_speed: z.enum(["slow", "average", "fast"]),
  attention_span: z.enum(["short", "medium", "long"]),
  interest_signals: z.record(z.string(), z.number().min(0).max(100)),
  strengths: z.array(z.object({
    area: z.string(),
    evidence: z.string(),
  })),
  gaps: z.array(z.object({
    area: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    evidence: z.string(),
  })),
  recommended_content_style: z.string().optional(),
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
Return a structured JSON object matching the schema.`
}

export async function generateStudentLearningProfile(
  studentId: string,
  userId: string
) {
  await enforceSubscriptionAccess({ userId, feature: "ai" })

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

  if (!student || !student.profile) {
    throw new Error("Student or profile not found")
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

  const result = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: studentLearningProfileSchema,
    prompt,
    maxOutputTokens: 3000,
  })

  // Save or update learning profile
  const profile = await prisma.studentLearningProfile.upsert({
    where: { studentId },
    update: {
      academicLevelBySubject: result.object.academic_level_by_subject as unknown as object,
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
      academicLevelBySubject: result.object.academic_level_by_subject as unknown as object,
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
