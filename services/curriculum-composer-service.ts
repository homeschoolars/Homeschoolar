import "server-only"
import { generateObject } from "ai"
import { z } from "zod"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { getMasterKnowledgeFramework, getAllowedSubjects } from "@/services/master-knowledge-framework"
import { getStudentLearningProfile } from "@/services/learning-profile-service"
import { withRetry, isSchemaValidationError, isRateLimitError } from "@/lib/openai-retry"

/**
 * LAYER 3: AI CURRICULUM COMPOSER (Dynamic)
 * 
 * Generates personalized curriculum using:
 * - Master Knowledge Framework (Layer 1)
 * - Student Learning Profile (Layer 2)
 * - Child-specific data (age, interests, religion)
 */

/**
 * Curriculum JSON Schema - Matches specification exactly
 */
const curriculumSubjectSchema = z.object({
  name: z.string().describe("Subject name"),
  entryLevel: z.enum(["Foundation", "Bridge", "Advanced"]).describe("Entry level based on assessment"),
  weeklyLessons: z.number().int().min(1).max(7).describe("Number of lessons per week"),
  teachingStyle: z.string().describe("Teaching method (e.g., 'visual', 'story-based', 'hands-on')"),
  difficultyProgression: z.enum(["linear", "adaptive"]).describe("How difficulty increases over time"),
  estimatedMastery: z.string().describe("Time-to-mastery estimate (e.g., '8-12 weeks')"),
  microSkills: z.array(z.string()).describe("Micro-skills to develop in this subject"),
  learningGoals: z.array(z.string()).describe("Learning goals for this subject"),
})

const curriculumSchema = z.object({
  studentId: z.string().describe("Student ID"),
  ageBand: z.string().describe("Age band (e.g., '4-7', '8-13')"),
  subjects: z.array(curriculumSubjectSchema).describe("Curriculum for each subject"),
  electives: z.array(z.string()).optional().describe("Elective subjects (only for age 8-13)"),
  aiNotes: z.string().describe("AI-generated notes explaining curriculum personalization"),
})

export type Curriculum = z.infer<typeof curriculumSchema>
export type CurriculumSubject = z.infer<typeof curriculumSubjectSchema>

/**
 * Build AI Curriculum Composer Prompt
 * 
 * Implements 5-step generation logic:
 * 1. Subject Filtering (mandatory, conditional, electives)
 * 2. Entry Level Decision (Foundation/Bridge/Advanced)
 * 3. Subject Curriculum Breakdown (goals, skills, lessons, progression)
 * 4. Interest & Personality Weighting (adjustments)
 * 5. Guardrails & Safety Rules (enforcement)
 */
function buildCurriculumComposerPrompt({
  childName,
  age,
  ageBand,
  religion,
  interests,
  masterFramework,
  learningProfile,
  allowedSubjects,
}: {
  childName: string
  age: number
  ageBand: "4-7" | "8-13"
  religion: "muslim" | "non_muslim"
  interests: string[]
  masterFramework: Awaited<ReturnType<typeof getMasterKnowledgeFramework>>
  learningProfile: NonNullable<Awaited<ReturnType<typeof getStudentLearningProfile>>>
  allowedSubjects: Awaited<ReturnType<typeof getAllowedSubjects>>
}) {
  const academicLevels = learningProfile.academicLevelBySubject as Record<string, { level: string; confidence: number; evidence: string[] }>
  const interestSignals = learningProfile.interestSignals as Record<string, number>
  const strengths = learningProfile.strengths as Array<{ area: string; evidence: string }>
  const gaps = learningProfile.gaps as Array<{ area: string; priority: string; evidence: string }>

  return `You are an AI Curriculum Composer for an AI-powered homeschooling platform (Age 4-13).

MISSION: Generate a personalized, AI-driven curriculum - NOT a static syllabus.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

========================================
INPUT DATA
========================================

STUDENT PROFILE:
- Name: ${childName}
- Age: ${age} years
- Age Band: ${ageBand}
- Religion: ${religion}
- Interests: ${interests.join(", ") || "Not specified"}
- Learning Speed: ${learningProfile.learningSpeed}
- Attention Span: ${learningProfile.attentionSpan}
- Learning Style: ${learningProfile.recommendedContentStyle || "Not assessed"}

ACADEMIC LEVELS BY SUBJECT:
${Object.entries(academicLevels).map(([subject, data]) => 
  `- ${subject}: ${data.level} (confidence: ${data.confidence}%)`
).join("\n") || "No assessment data"}

STRENGTHS:
${strengths.map(s => `- ${s.area}: ${s.evidence}`).join("\n") || "None identified"}

GAPS (Priority Areas):
${gaps.map(g => `- ${g.area} (${g.priority} priority): ${g.evidence}`).join("\n") || "None identified"}

INTEREST SIGNALS (0-100):
${Object.entries(interestSignals).map(([topic, score]) => 
  `- ${topic}: ${score}`
).join("\n") || "No interest data"}

MASTER KNOWLEDGE FRAMEWORK:
- Mandatory Subjects: ${allowedSubjects.mandatory.join(", ")}
- Conditional Subjects: ${allowedSubjects.conditional.join(", ") || "None"}
- Electives (${ageBand === "8-13" ? "Available" : "Not available"}): ${allowedSubjects.electives.join(", ") || "None"}
- Max Weekly Lessons: ${masterFramework.ageBands[ageBand].maxWeeklyLessons}
- Max Lesson Duration: ${masterFramework.ageBands[ageBand].maxLessonDuration} minutes

========================================
5-STEP CURRICULUM GENERATION LOGIC
========================================

STEP 1 — SUBJECT FILTERING
- Mandatory subjects: ${allowedSubjects.mandatory.join(", ")}
- Conditional subjects: ${religion === "muslim" ? allowedSubjects.conditional.join(", ") : "None (non-Muslim)"}
- Electives: ${ageBand === "8-13" ? allowedSubjects.electives.join(", ") : "Not available for age 4-7"}
- Generate curriculum for ALL mandatory + conditional subjects
- Include electives ONLY if ageBand = "8-13" AND student shows interest

STEP 2 — ENTRY LEVEL DECISION PER SUBJECT
Use assessment signals from academic_level_by_subject:
- Very weak (beginner/low confidence) → Foundation
- Mixed (intermediate/medium confidence) → Bridge  
- Strong (advanced/high confidence) → Advanced
- Base decision on academic_level_by_subject data provided above

STEP 3 — SUBJECT CURRICULUM BREAKDOWN
For EACH subject, generate:
- learningGoals: 3-5 specific learning goals aligned with Master Framework
- microSkills: 5-8 micro-skills that build toward mastery
- weeklyLessons: Number of lessons per week (1-7, respect maxWeeklyLessons)
- teachingStyle: Adapt to learning style (visual/story/logic/applied)
- difficultyProgression: "linear" (steady) or "adaptive" (adjusts based on performance)
- estimatedMastery: Realistic time estimate (e.g., "8-12 weeks", "12-16 weeks")

STEP 4 — INTEREST & PERSONALITY WEIGHTING
Adjust curriculum based on:
- Interests: Emphasize subjects/topics with high interest signals (>70)
- Attention Span: If "short", reduce weeklyLessons and lesson duration
- Learning Style: Adapt teachingStyle to recommendedContentStyle
- Strengths: Build on strong areas identified in assessment
- Gaps: Prioritize high-priority gaps in learningGoals

STEP 5 — GUARDRAILS & SAFETY RULES
Enforce hard constraints:
- NO unsafe age content (respect age band ${ageBand})
- NO cognitive overload (respect attention span: ${learningProfile.attentionSpan})
- Respect maxWeeklyLessons: ${masterFramework.ageBands[ageBand].maxWeeklyLessons}
- Progressive mastery before level advancement
- Religion-sensitive: ${religion === "muslim" ? "Include Islamic Studies" : "Exclude Islamic Studies"}
- Balanced workload per week (don't overload any single subject)

========================================
STRICT OUTPUT SCHEMA
========================================

{
  "studentId": "${childName}",
  "ageBand": "${ageBand}",
  "subjects": array (required, must include ALL mandatory + conditional subjects),
    - Each item: {
        "name": string (required, exact subject name from Master Framework),
        "entryLevel": "Foundation" | "Bridge" | "Advanced" (required, exact match),
        "weeklyLessons": number (required, integer 1-7, total must not exceed ${masterFramework.ageBands[ageBand].maxWeeklyLessons}),
        "teachingStyle": string (required, e.g., "visual", "story-based", "hands-on", "logical"),
        "difficultyProgression": "linear" | "adaptive" (required, exact match),
        "estimatedMastery": string (required, e.g., "8-12 weeks"),
        "microSkills": array (required, 5-8 items, specific micro-skills),
        "learningGoals": array (required, 3-5 items, specific learning goals)
      },
  "electives": array (optional, only if ageBand = "8-13", subject names),
  "aiNotes": string (required, 3-5 sentences explaining personalization decisions)
}

========================================
VALIDATION CHECKLIST (VERIFY BEFORE OUTPUT)
========================================

✓ studentId: matches provided student ID
✓ ageBand: exact match "${ageBand}"
✓ subjects: array with ALL mandatory + conditional subjects
✓ Each subject has: name (exact from Master Framework), entryLevel (exact enum), weeklyLessons (1-7), teachingStyle (string), difficultyProgression (exact enum), estimatedMastery (string), microSkills (5-8 items), learningGoals (3-5 items)
✓ Total weeklyLessons across all subjects ≤ ${masterFramework.ageBands[ageBand].maxWeeklyLessons}
✓ electives: only present if ageBand = "8-13", contains valid elective subject names
✓ aiNotes: non-empty string (3-5 sentences)
✓ Entry levels match assessment signals (Foundation for weak, Bridge for mixed, Advanced for strong)
✓ Teaching styles adapt to learning style: ${learningProfile.recommendedContentStyle || "mixed"}
✓ Weekly lessons respect attention span: ${learningProfile.attentionSpan}
✓ Interest weighting applied (high-interest subjects emphasized)

========================================
ANTI-HALLUCINATION RULES
========================================

- ONLY use subjects from Master Framework mandatory/conditional/electives lists
- NEVER invent new subjects or topics
- Entry levels MUST match academic_level_by_subject assessment data
- Teaching styles MUST align with recommendedContentStyle
- Weekly lessons MUST respect maxWeeklyLessons constraint
- Micro-skills and learning goals MUST be age-appropriate for ${ageBand}
- Estimated mastery MUST be realistic (typically 8-16 weeks per subject)

========================================
GENERATION INSTRUCTIONS
========================================

1. Apply STEP 1: Filter subjects (mandatory + conditional + electives if applicable)
2. Apply STEP 2: Determine entry level per subject from assessment data
3. Apply STEP 3: Generate detailed breakdown (goals, skills, lessons, progression)
4. Apply STEP 4: Weight by interests, attention span, learning style
5. Apply STEP 5: Enforce guardrails (age safety, cognitive load, balance)

Generate a comprehensive, personalized curriculum. Output must be valid JSON.`
}

/**
 * Generate AI Curriculum
 * 
 * Uses 3-layer system:
 * 1. Master Knowledge Framework (static reference)
 * 2. Student Learning Profile (dynamic, from assessments)
 * 3. AI Curriculum Composer (generates personalized curriculum)
 */
export async function generateAICurriculum(
  childId: string,
  userId: string
): Promise<Curriculum> {
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key is not configured. " +
      "Please set OPENAI_API_KEY in your environment variables."
    )
  }

  // Get child data
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      profile: true,
      interestsV2: true,
    },
  })

  if (!child || !child.profile) {
    throw new Error("Child or profile not found")
  }

  const age = child.profile.ageYears
  const ageBand: "4-7" | "8-13" = age >= 4 && age <= 7 ? "4-7" : "8-13"
  const religion = child.profile.religion
  const interests = child.interestsV2.map((i) => i.label)

  // Get Layer 1: Master Knowledge Framework
  const masterFramework = await getMasterKnowledgeFramework()
  const allowedSubjects = await getAllowedSubjects(ageBand, religion)

  // Get Layer 2: Student Learning Profile
  let learningProfile = await getStudentLearningProfile(childId)
  if (!learningProfile) {
    // Generate learning profile if it doesn't exist
    const profileService = await import("@/services/learning-profile-service")
    learningProfile = await profileService.generateStudentLearningProfile(childId, userId)
  }

  if (!learningProfile) {
    throw new Error(
      "Student learning profile is required for curriculum generation. " +
      "Please complete assessments first."
    )
  }

  // Build prompt with 5-step logic
  const prompt = buildCurriculumComposerPrompt({
    childName: child.name,
    age,
    ageBand,
    religion,
    interests,
    masterFramework,
    learningProfile,
    allowedSubjects,
  })

  // Generate curriculum using AI
  const result = await withRetry(
    () =>
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: curriculumSchema,
        prompt,
      }),
    {
      maxRetries: 3,
      retryDelay: 1000,
    }
  )

  return result.object
}

/**
 * Save curriculum to database
 */
export async function saveCurriculum(
  childId: string,
  curriculum: Curriculum
): Promise<void> {
  // Update curriculum paths for each subject
  for (const subject of curriculum.subjects) {
    const subjectRecord = await prisma.subject.findFirst({
      where: { name: subject.name },
    })

    if (subjectRecord) {
      await prisma.curriculumPath.upsert({
        where: {
          childId_subjectId: {
            childId,
            subjectId: subjectRecord.id,
          },
        },
        update: {
          currentTopic: subject.learningGoals[0] || null,
          nextTopics: subject.learningGoals.slice(1),
          masteryLevel: subject.entryLevel === "Foundation" ? 0
            : subject.entryLevel === "Bridge" ? 50
            : 75,
        },
        create: {
          childId,
          subjectId: subjectRecord.id,
          currentTopic: subject.learningGoals[0] || null,
          nextTopics: subject.learningGoals.slice(1),
          masteryLevel: subject.entryLevel === "Foundation" ? 0
            : subject.entryLevel === "Bridge" ? 50
            : 75,
        },
      })
    }
  }

  // Store full curriculum JSON in LearningRoadmap
  const existing = await prisma.learningRoadmap.findFirst({
    where: { studentId: childId },
    orderBy: { createdAt: "desc" },
  })

  if (existing) {
    await prisma.learningRoadmap.update({
      where: { id: existing.id },
      data: {
        roadmapJson: curriculum as unknown as object,
        lastUpdated: new Date(),
      },
    })
  } else {
    await prisma.learningRoadmap.create({
      data: {
        studentId: childId,
        roadmapJson: curriculum as unknown as object,
        generatedBy: "openai",
      },
    })
  }
}
