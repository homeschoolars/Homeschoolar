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
import { withRetry, isSchemaValidationError, isRateLimitError } from "@/lib/openai-retry"

const generatedEducationalContentSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  examples: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1),
  practice_questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        correct_answer: z.string().min(1),
      }),
    )
    .min(1),
  fun_fact: z.string().min(1),
})

const strictEducationalGenerationInstruction = `You are an expert curriculum designer and child education specialist.

Your job is to generate structured, age-appropriate educational content for students.

STRICT RULES:
- Always follow the JSON format exactly
- Do NOT add explanations outside JSON
- Do NOT include markdown or extra text
- Content must be age-appropriate, engaging, and simple
- Keep language clear and concise

CONTENT RULES:
- Focus on understanding, not memorization
- Include examples where helpful
- Avoid overly complex vocabulary for younger ages

IMPORTANT:
- Return ONLY valid JSON
- No text before or after JSON
- No explanations outside JSON
- Ensure all fields are filled

STYLE:
- Friendly and engaging tone
- Use simple storytelling where possible
- Make learning feel fun, not boring

If you cannot generate valid output, return:
{ "error": "generation_failed" }`

export type VideoScript = z.infer<typeof generatedEducationalContentSchema> | { error: "generation_failed" }

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

  const basePrompt = `Generate educational content with the following inputs:

Age Group: ${target_age}
Subject: ${subject_name}
Topic: ${topic}
Difficulty Level: ${concept_id}

REQUIREMENTS:
- Make it engaging and easy to understand
- Include explanation, examples, and practice

OUTPUT FORMAT (STRICT JSON):
{
  "title": "",
  "explanation": "",
  "examples": [
    {
      "question": "",
      "answer": ""
    }
  ],
  "practice_questions": [
    {
      "question": "",
      "options": ["", "", "", ""],
      "correct_answer": ""
    }
  ],
  "fun_fact": ""
}`

  // Keep existing lesson prompt as additional context while enforcing strict schema output.
  const curriculumContext = buildLessonContentPrompt({
    subject: subject_name,
    topic,
    conceptId: concept_id,
    targetAge: target_age,
    language,
  })

  const strictPrompt = `${strictEducationalGenerationInstruction}

${basePrompt}

Additional curriculum context:
${curriculumContext}`

  function validateAIResponse(data: unknown) {
    if (!data || typeof data !== "object") return false
    const candidate = data as {
      title?: unknown
      explanation?: unknown
      examples?: unknown
      practice_questions?: unknown
    }
    return !!(
      candidate.title &&
      candidate.explanation &&
      Array.isArray(candidate.examples) &&
      Array.isArray(candidate.practice_questions)
    )
  }

  async function generateWithRetry(prompt: string, retries = 3): Promise<VideoScript> {
    for (let i = 0; i < retries; i += 1) {
      try {
        const result = await withRetry(
          () =>
            generateObject({
              model: openai("gpt-4o-mini"),
              schema: generatedEducationalContentSchema,
              prompt,
            }),
          {
            maxRetries: 1,
            retryDelay: 500,
          },
        )
        if (validateAIResponse(result.object)) {
          return result.object
        }
      } catch (error) {
        const err = error as { status?: number; code?: string; message?: string }
        const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 200) : "unknown")
        console.error("[Lesson Content] Retry generation failed", {
          attempt: i + 1,
          hint,
          isSchemaError: isSchemaValidationError(error),
          isRateLimit: isRateLimitError(error),
        })
      }
    }
    return { error: "generation_failed" }
  }

  const script = await generateWithRetry(strictPrompt)

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
