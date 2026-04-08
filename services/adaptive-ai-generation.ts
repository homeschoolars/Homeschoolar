import "server-only"
import { generateObject } from "ai"
import { prisma } from "@/lib/prisma"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { withRetry, isRateLimitError } from "@/lib/openai-retry"
import {
  assertStudentLessonContentAccess,
  initializeStudentProgress,
} from "@/services/progression"
import {
  assertCanTakeLessonQuiz,
  assertLecturesComplete,
} from "@/services/lesson-gate"
import { buildAdaptivePrompt, type LessonPromptContext, type StudentPromptContext } from "@/services/adaptive-ai-prompt"
import {
  validateAIOutput,
  getZodSchemaForAdaptiveType,
  type AdaptiveContentType,
} from "@/services/adaptive-ai-validation"
import { toApiAgeGroup } from "@/lib/age-group"

/** Initial generation + at most one retry after validation failure */
const MAX_AI_ATTEMPTS = 2

type ScoreHistoryEntry = { pct: number; at?: string }

function parseScoreHistory(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (row && typeof row === "object" && "pct" in row) {
        const pct = Number((row as { pct: unknown }).pct)
        return Number.isFinite(pct) ? pct : null
      }
      return null
    })
    .filter((n): n is number => n != null)
}

async function assertAdaptiveGenerationAllowed(studentId: string, lessonId: string, contentType: AdaptiveContentType) {
  await initializeStudentProgress(studentId, lessonId)
  await assertStudentLessonContentAccess(studentId, lessonId)

  if (contentType === "worksheet" || contentType === "quiz") {
    await assertLecturesComplete(studentId, lessonId)
  }
  if (contentType === "quiz") {
    await assertCanTakeLessonQuiz(studentId, lessonId)
  }
}

async function loadContexts(studentId: string, lessonId: string): Promise<{ lesson: LessonPromptContext; student: StudentPromptContext }> {
  const child = await prisma.child.findUnique({
    where: { id: studentId },
    select: {
      name: true,
      ageGroup: true,
      currentLevel: true,
      weakAreas: true,
      adaptiveScoreHistory: true,
      profile: { select: { ageYears: true } },
    },
  })
  if (!child) throw new Error("Student not found")

  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    include: {
      content: true,
      unit: {
        include: {
          subject: { include: { ageGroup: true } },
        },
      },
    },
  })
  if (!lesson?.content) throw new Error("Lesson not found")

  const lessonCtx: LessonPromptContext = {
    lessonTitle: lesson.title,
    subjectName: lesson.unit.subject.name,
    topicTitle: lesson.unit.title,
    ageGroupName: lesson.unit.subject.ageGroup.name,
    storyText: lesson.content.storyText,
    activityInstructions: lesson.content.activityInstructions,
    quizConcept: lesson.content.quizConcept,
    worksheetExample: lesson.content.worksheetExample,
    parentTip: lesson.content.parentTip,
  }

  const history = parseScoreHistory(child.adaptiveScoreHistory as unknown)

  const studentCtx: StudentPromptContext = {
    name: child.name,
    ageYears: child.profile?.ageYears ?? null,
    ageGroupLabel: toApiAgeGroup(child.ageGroup),
    currentLevel: child.currentLevel,
    weakAreas: child.weakAreas ?? [],
    recentScoresPercent: history,
  }

  return { lesson: lessonCtx, student: studentCtx }
}

function stringifyAdaptiveContent(_contentType: AdaptiveContentType, data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Central adaptive AI pipeline: gated access, structured prompt, OpenAI with schema, validation + retries, per-student cache.
 */
export async function generateAIContent(params: {
  studentId: string
  lessonId: string
  contentType: AdaptiveContentType
  forceRegenerate?: boolean
}): Promise<{ cached: boolean; content: string; contentJson: unknown }> {
  const { studentId, lessonId, contentType, forceRegenerate = false } = params

  await assertAdaptiveGenerationAllowed(studentId, lessonId, contentType)

  const sessionKey = `student:${studentId}`

  const existing = await prisma.curriculumGeneratedContent.findUnique({
    where: { lessonId_type_sessionKey: { lessonId, type: contentType, sessionKey } },
    select: { content: true, contentJson: true },
  })
  if (existing && !forceRegenerate) {
    return { cached: true, content: existing.content, contentJson: existing.contentJson }
  }

  const { lesson, student } = await loadContexts(studentId, lessonId)
  const prompt = buildAdaptivePrompt({ lesson, student, contentType })
  const zodSchema = getZodSchemaForAdaptiveType(contentType)

  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured")
  }

  let lastError = "AI output validation failed"
  let contentJson: unknown

  for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt += 1) {
    try {
      const result = await withRetry(
        () =>
          generateObject({
            model: openai("gpt-4o-mini"),
            schema: zodSchema,
            prompt: `${prompt}\n\nAttempt ${attempt}/${MAX_AI_ATTEMPTS}. Return only valid JSON matching the schema.`,
          }),
        { maxRetries: 2, retryDelay: 1000 },
      )
      contentJson = result.object
    } catch (e) {
      if (isRateLimitError(e)) throw e
      lastError = e instanceof Error ? e.message : "AI generation failed"
      if (attempt === MAX_AI_ATTEMPTS) throw new Error(lastError)
      continue
    }

    const validated = validateAIOutput(contentType, contentJson)
    if (validated.ok) {
      contentJson = validated.data
      break
    }
    lastError = validated.error
    if (attempt === MAX_AI_ATTEMPTS) {
      throw new Error(`AI output failed validation after ${MAX_AI_ATTEMPTS} attempts: ${lastError}`)
    }
  }

  const content = stringifyAdaptiveContent(contentType, contentJson)

  await prisma.curriculumGeneratedContent.upsert({
    where: { lessonId_type_sessionKey: { lessonId, type: contentType, sessionKey } },
    update: {
      content,
      contentJson: contentJson as object,
      promptSnapshot: prompt.slice(0, 12000),
      model: "gpt-4o-mini",
      sessionKey,
      studentId,
    },
    create: {
      lessonId,
      type: contentType,
      sessionKey,
      studentId,
      content,
      contentJson: contentJson as object,
      promptSnapshot: prompt.slice(0, 12000),
      model: "gpt-4o-mini",
    },
  })

  return { cached: false, content, contentJson }
}
