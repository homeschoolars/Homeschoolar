import "server-only"
import { z } from "zod"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { toPrismaAgeGroup } from "@/lib/age-group"
import type { AgeGroup } from "@/lib/types"
import type { ContentLanguage } from "@/lib/ai-architecture"
import { buildLessonContentPrompt } from "@/services/ai-prompts"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const videoScriptSectionSchema = z.object({
  label: z.string(),
  duration_estimate_sec: z.number(),
  script: z.string(),
  examples: z.array(z.string()),
  interactive_prompts: z.array(z.string()),
})

const videoScriptSchema = z.object({
  title: z.string(),
  concept_id: z.string(),
  age_bracket: z.enum(["4-6", "7-9", "10-13"]),
  vocabulary_level: z.string(),
  sections: z.array(videoScriptSectionSchema),
  cultural_context_notes: z.string().optional(),
  total_duration_estimate_sec: z.number(),
})

export type VideoScript = z.infer<typeof videoScriptSchema>

export interface GenerateLessonContentInput {
  subject_id: string
  subject_name: string
  topic: string
  concept_id: string
  target_age: AgeGroup
  language?: ContentLanguage
  userId: string
}

/** Phase 1: AI Content Generation Engine. Story-based video script, one-concept-per-lesson, cacheable. */
export async function generateLessonContent(
  input: GenerateLessonContentInput
): Promise<VideoScript> {
  const { subject_id, subject_name, topic, concept_id, target_age, language = "en", userId } = input
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  const cached = await prisma.lessonContent.findUnique({
    where: {
      subjectId_topic_conceptId_ageGroup_language: {
        subjectId: subject_id,
        topic,
        conceptId: concept_id,
        ageGroup: toPrismaAgeGroup(target_age),
        language,
      },
    },
  })
  if (cached?.script) {
    return cached.script as unknown as VideoScript
  }

  const prompt = buildLessonContentPrompt({
    subject: subject_name,
    topic,
    conceptId: concept_id,
    targetAge: target_age,
    language,
  })

  const result = await generateObject({
    model: openai("gpt-5-mini"),
    schema: videoScriptSchema,
    prompt,
    maxTokens: 4000,
  })

  const script = result.object

  await prisma.lessonContent.upsert({
    where: {
      subjectId_topic_conceptId_ageGroup_language: {
        subjectId: subject_id,
        topic,
        conceptId: concept_id,
        ageGroup: toPrismaAgeGroup(target_age),
        language,
      },
    },
    update: { script: script as unknown as object },
    create: {
      subjectId: subject_id,
      topic,
      conceptId: concept_id,
      ageGroup: toPrismaAgeGroup(target_age),
      language,
      script: script as unknown as object,
    },
  })

  return script
}
