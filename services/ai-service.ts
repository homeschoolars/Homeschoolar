import "server-only"
import { generateObject } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup, toPrismaAgeGroup } from "@/lib/age-group"
import type {
  AgeGroup,
  Difficulty,
  GenerateWorksheetRequest,
  GradeSubmissionRequest,
  Answer,
  QuizQuestion,
} from "@/lib/types"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import {
  buildWorksheetPrompt,
  buildGradeSubmissionPrompt,
  buildGenerateQuizPrompt,
  buildGradeQuizPrompt,
  buildRecommendCurriculumPrompt,
  buildCurriculumFromAssessmentPrompt,
} from "@/services/ai-prompts"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { STATIC_WORKSHEET_SYSTEM_PROMPT, STATIC_QUIZ_SYSTEM_PROMPT } from "@/lib/static-prompts"
import { TOKEN_LIMITS } from "@/lib/openai-cache"
import { withRetry, isSchemaValidationError, isRateLimitError } from "@/lib/openai-retry"

const DAILY_AI_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? "50")

async function enforceDailyLimit(userId: string | null, feature: string) {
  if (!userId) return
  
  // Admin users bypass daily limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  
  if (user?.role === "admin") {
    return // Admins have unlimited AI usage
  }
  
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const usageCount = await prisma.analyticsEvent.count({
    where: { userId, eventType: { startsWith: "ai." }, createdAt: { gte: since } },
  })
  if (usageCount >= DAILY_AI_LIMIT) {
    throw new Error(`AI usage limit exceeded for ${feature}`)
  }
}

async function logUsage({
  userId,
  feature,
  eventData,
}: {
  userId: string | null
  feature: string
  eventData?: Record<string, unknown>
}) {
  if (!userId) return
  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventType: `ai.${feature}`,
      eventData: (eventData ?? {}) as unknown as object,
    },
  })
}

async function getParentIdFromChild(childId: string) {
  const child = await prisma.child.findUnique({ where: { id: childId }, select: { parentId: true } })
  return child?.parentId ?? null
}

async function resolveParentUserId(childId: string) {
  const parentId = await getParentIdFromChild(childId)
  if (!parentId) {
    throw new Error("Parent account not found")
  }
  return parentId
}

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "text", "true_false", "fill_blank"]),
  question: z.string(),
  options: z.union([z.array(z.string()), z.null()]),
  correct_answer: z.string(),
  points: z.number(),
  hint: z.union([z.string(), z.null()]),
})

const worksheetSchema = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(questionSchema),
  answer_key: z.array(
    z.object({
      question_id: z.string(),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  explanations: z.array(
    z.object({
      question_id: z.string(),
      step_by_step: z.array(z.string()),
      concept: z.string(),
      tips: z.array(z.string()),
    }),
  ),
})

const gradingSchema = z.object({
  score: z.number(),
  max_score: z.number(),
  graded_answers: z.array(
    z.object({
      question_id: z.string(),
      answer: z.string(),
      is_correct: z.boolean(),
      feedback: z.string(),
    }),
  ),
  overall_feedback: z.string(),
  areas_to_improve: z.array(z.string()),
  strengths: z.array(z.string()),
})

const quizSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["multiple_choice", "true_false"]),
      question: z.string(),
      options: z.union([z.array(z.string()), z.null()]),
      correct_answer: z.string(),
      points: z.number(),
    }),
  ),
})

const quizGradingSchema = z.object({
  score: z.number(),
  graded_answers: z.array(
    z.object({
      question_id: z.string(),
      is_correct: z.boolean(),
      feedback: z.string(),
    }),
  ),
  overall_feedback: z.string(),
  encouragement: z.string(),
})


const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      type: z.enum(["subject", "topic", "worksheet", "activity"]),
      title: z.string(),
      description: z.string(),
      reason: z.string(),
      priority: z.number(),
    }),
  ),
})

const curriculumPlanSchema = z.object({
  subjects: z.array(
    z.object({
      subject_id: z.string(),
      subject_name: z.string(),
      current_topic: z.string(),
      next_topics: z.array(z.string()),
      rationale: z.string().optional(),
    })
  ),
  summary: z.string().optional(),
})

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Generates worksheets for learning activities.
 * These will be graded with scores for parent progress tracking.
 */
export async function generateWorksheet(
  body: GenerateWorksheetRequest,
  userId: string,
  options?: { bypassSubscriptionChecks?: boolean; autoApprove?: boolean },
) {
  const { subject_id, subject_name, age_group, difficulty, topic, num_questions = 5, child_level } = body
  
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key is not configured. " +
      "Please set OPENAI_API_KEY in your environment variables. " +
      "Get your API key from: https://platform.openai.com/api-keys"
    )
  }
  
  const dynamicPrompt = buildWorksheetPrompt({
    subjectName: subject_name,
    ageGroup: age_group,
    difficulty,
    topic,
    numQuestions: num_questions,
    childLevel: child_level,
  })
  const prompt = `${STATIC_WORKSHEET_SYSTEM_PROMPT}\n\n${dynamicPrompt}`

  if (!options?.bypassSubscriptionChecks) {
    await enforceSubscriptionAccess({ userId, feature: "ai" })
  }
  await enforceDailyLimit(userId, "generate-worksheet")

  try {
    const result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: worksheetSchema,
          prompt,
        }),
      {
        maxRetries: 3,
        retryDelay: 1000,
      }
    )

    const worksheet = await prisma.worksheet.create({
      data: {
        title: result.object.title,
        description: result.object.description,
        subjectId: subject_id,
        ageGroup: toPrismaAgeGroup(age_group),
        difficulty,
        questions: result.object.questions,
        answerKey: result.object.answer_key,
        explanations: result.object.explanations,
        isAiGenerated: true,
        isApproved: options?.autoApprove ?? false,
        aiPrompt: prompt,
        createdBy: userId,
      },
    })

    await logUsage({
      userId,
      feature: "generate-worksheet",
      eventData: { subjectId: subject_id, difficulty, ageGroup: age_group },
    })

    return worksheet
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 100) : "unknown")
    
    // Provide more specific error messages
    if (isSchemaValidationError(error)) {
      console.error("[Worksheet] JSON schema validation error:", {
        status: err?.status,
        message: err?.message,
        schema: "worksheetSchema",
      })
      throw new Error(
        `Invalid JSON schema for worksheet generation (400 Bad Request). ` +
        `This indicates a schema validation issue. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    if (isRateLimitError(error)) {
      throw new Error(
        `OpenAI rate limit exceeded (429 Too Many Requests). ` +
        `Please wait a moment and try again. ` +
        `If this persists, check your OpenAI quota and billing.`
      )
    }
    
    if (err?.status === 400) {
      throw new Error(
        `Invalid request to OpenAI API (400 Bad Request). ` +
        `This usually means the prompt format is invalid or the schema doesn't match. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    throw new Error(
      `Failed to generate worksheet: ${hint}. ` +
      "Please check your OpenAI API key, quota, billing, and key restrictions."
    )
  }
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Grades worksheet submissions with scores and marks.
 * This is LEARNING MODE - parents need measurable academic progress.
 */
export async function gradeSubmission(body: GradeSubmissionRequest, userId: string) {
  const { worksheet, answers, child_age_group } = body

  const questionsWithAnswers = worksheet.questions.map((q) => {
    const studentAnswer = answers.find((a) => a.question_id === q.id)
    return {
      question: q.question,
      type: q.type,
      correct_answer: q.correct_answer,
      student_answer: studentAnswer?.answer || "Not answered",
      points: q.points,
      id: q.id,
    }
  })

  const prompt = buildGradeSubmissionPrompt({
    ageGroup: child_age_group,
    worksheetTitle: worksheet.title,
    subject: worksheet.description || "",
    questions: questionsWithAnswers,
  })

  await enforceSubscriptionAccess({ userId, feature: "ai" })
  await enforceDailyLimit(userId, "grade-submission")

  const result = await withRetry(
    () =>
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: gradingSchema,
        prompt,
      }),
    {
      maxRetries: 2,
      retryDelay: 1000,
    }
  )

  await logUsage({
    userId,
    feature: "grade-submission",
    eventData: { worksheetId: worksheet.id, ageGroup: child_age_group },
  })

  return result.object
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Generates surprise quizzes for learning activities.
 * These will be graded with scores for parent progress tracking.
 */
export async function generateQuiz({
  child_id,
  subject_id,
  subject_name,
  age_group,
  recent_topics,
}: {
  child_id: string
  subject_id?: string
  subject_name?: string
  age_group: AgeGroup
  recent_topics?: string[]
}) {
  const resolvedUserId = await resolveParentUserId(child_id)
  await enforceSubscriptionAccess({ userId: resolvedUserId, feature: "ai" })
  await enforceDailyLimit(resolvedUserId, "generate-quiz")

  let targetSubject = subject_name
  let targetSubjectId = subject_id

  if (!subject_id) {
    const subjects = await prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { displayOrder: "asc" } })
    if (subjects.length > 0) {
      const randomIndex = Math.floor(Math.random() * subjects.length)
      targetSubject = subjects[randomIndex].name
      targetSubjectId = subjects[randomIndex].id
    }
  }

  // Derive recently learned topics from curriculum progress for stronger relevance.
  let learnedTopics: string[] = []
  if (targetSubjectId) {
    const paths = await prisma.curriculumPath.findMany({
      where: {
        childId: child_id,
        subjectId: targetSubjectId,
      },
      select: {
        currentTopic: true,
        completedTopics: true,
      },
      take: 1,
    })
    const current = paths[0]?.currentTopic ? [paths[0].currentTopic] : []
    const completed = paths[0]?.completedTopics ?? []
    learnedTopics = [...current, ...completed].filter((t): t is string => typeof t === "string" && t.trim().length > 0)
  }
  const effectiveRecentTopics = [...(recent_topics ?? []), ...learnedTopics].slice(0, 12)

  // Build segmented prompt: static (cacheable) + dynamic (non-cached)
  const dynamicPrompt = buildGenerateQuizPrompt({
    ageGroup: age_group,
    subjectName: targetSubject || "General Knowledge",
    recentTopics: effectiveRecentTopics,
  })

  const fullPrompt = `${STATIC_QUIZ_SYSTEM_PROMPT}\n\n${dynamicPrompt}`

  const result = await withRetry(
    () =>
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: quizSchema,
        prompt: fullPrompt,
      }),
    {
      maxRetries: 3,
      retryDelay: 1000,
    }
  )

  const generatedQuestions = result.object.questions.slice(0, 20).map((q, idx) => ({
    ...q,
    id: q.id || `quiz-${idx + 1}`,
    points: 1,
  }))
  if (generatedQuestions.length !== 20) {
    throw new Error(`Quiz generation returned ${generatedQuestions.length} questions. Expected exactly 20.`)
  }
  const questions = generatedQuestions

  const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

  const quiz = await prisma.surpriseQuiz.create({
    data: {
      childId: child_id,
      subjectId: targetSubjectId,
      questions,
      maxScore,
    },
  })

  await prisma.child.update({
    where: { id: child_id },
    data: { lastQuizAt: new Date() },
  })

  await logUsage({
    userId: resolvedUserId,
    feature: "generate-quiz",
    eventData: { childId: child_id, subjectId: targetSubjectId },
  })

  return quiz
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Grades surprise quizzes with scores and marks.
 * This is LEARNING MODE - tracks academic performance.
 */
export async function gradeQuiz({
  quiz_id,
  answers,
  age_group,
}: {
  quiz_id: string
  answers: Answer[]
  age_group: string
}) {
  const quiz = await prisma.surpriseQuiz.findUnique({ where: { id: quiz_id } })
  if (!quiz) {
    throw new Error("Quiz not found")
  }
  const resolvedUserId = await resolveParentUserId(quiz.childId)
  await enforceSubscriptionAccess({ userId: resolvedUserId, feature: "ai" })
  await enforceDailyLimit(resolvedUserId, "grade-quiz")

  const questions = quiz.questions as unknown as QuizQuestion[]
  const questionsWithAnswers = questions.map((q) => {
    const studentAnswer = answers.find((a) => a.question_id === q.id)
    return {
      id: q.id,
      question: q.question,
      correct_answer: q.correct_answer,
      student_answer: studentAnswer?.answer || "Not answered",
      points: q.points,
    }
  })

  const prompt = buildGradeQuizPrompt({
    ageGroup: age_group,
    questions: questionsWithAnswers,
  })

  const result = await withRetry(
    () =>
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: quizGradingSchema,
        prompt,
      }),
    {
      maxRetries: 2,
      retryDelay: 1000,
    }
  )

  const normalizedGradedAnswers = questions.map((question) => {
    const aiMatch = result.object.graded_answers.find((answer) => answer.question_id === question.id)
    const studentAnswer = answers.find((answer) => answer.question_id === question.id)?.answer || "Not answered"
    const isCorrect = studentAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
    return {
      question_id: question.id,
      is_correct: isCorrect,
      feedback:
        aiMatch?.feedback ||
        (isCorrect
          ? "Great job! You got this one right."
          : `Good effort. The correct answer is ${question.correct_answer}.`),
    }
  })
  const computedScore = normalizedGradedAnswers.filter((answer) => answer.is_correct).reduce((sum) => sum + 1, 0)

  await prisma.surpriseQuiz.update({
    where: { id: quiz_id },
    data: {
      answers: answers as unknown as object,
      score: computedScore,
      feedback: result.object.overall_feedback,
      completedAt: new Date(),
    },
  })

  await logUsage({
    userId: resolvedUserId,
    feature: "grade-quiz",
    eventData: { quizId: quiz_id, ageGroup: age_group },
  })

  return { ...result.object, score: computedScore, graded_answers: normalizedGradedAnswers, max_score: quiz.maxScore }
}


export async function recommendCurriculum({ child_id }: { child_id: string; userId?: string }) {
  const child = await prisma.child.findUnique({ where: { id: child_id } })
  if (!child) {
    throw new Error("Child not found")
  }
  const resolvedUserId = await resolveParentUserId(child_id)
  await enforceSubscriptionAccess({ userId: resolvedUserId, feature: "ai" })
  await enforceDailyLimit(resolvedUserId, "recommend-curriculum")

  const progress = await prisma.progress.findMany({
    where: { childId: child_id },
    include: { subject: true },
  })

  const curriculumPaths = await prisma.curriculumPath.findMany({
    where: { childId: child_id },
    include: { subject: true },
  })

  const recentSubmissions = await prisma.worksheetSubmission.findMany({
    where: { childId: child_id },
    orderBy: { submittedAt: "desc" },
    take: 10,
  })

  const prompt = buildRecommendCurriculumPrompt({
    ageGroup: toApiAgeGroup(child.ageGroup),
    childName: child.name,
    currentLevel: child.currentLevel,
    interests: child.interests,
    learningStyle: child.learningStyle,
    progress: progress.map((p) => ({
      subject: p.subject?.name || "",
      averageScore: Number(p.averageScore),
      completedWorksheets: p.completedWorksheets,
    })),
    curriculumPaths: curriculumPaths.map((cp) => ({
      subject: cp.subject?.name || "",
      currentTopic: cp.currentTopic,
      nextTopics: cp.nextTopics,
    })),
    recentSubmissions: recentSubmissions.map((s) => ({
      score: s.score ? Number(s.score) : 0,
      maxScore: s.maxScore ? Number(s.maxScore) : 0,
    })),
  })

  const result = await withRetry(
    () =>
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: recommendationSchema,
        prompt,
      }),
    {
      maxRetries: 3,
      retryDelay: 1000,
    }
  )

  await prisma.aIRecommendation.deleteMany({ where: { childId: child_id, isDismissed: false } })

  await prisma.aIRecommendation.createMany({
    data: result.object.recommendations.map((rec) => ({
      childId: child_id,
      type: rec.type,
      title: rec.title,
      description: rec.description,
      reason: rec.reason,
      priority: rec.priority,
    })),
  })

  await logUsage({
    userId: resolvedUserId,
    feature: "recommend-curriculum",
    eventData: { childId: child_id },
  })

  return result.object.recommendations
}

/** 
 * Generate or regenerate curriculum plan from stored assessments.
 * 
 * Uses 3-layer curriculum system:
 * 1. Master Knowledge Framework (static reference)
 * 2. Student Learning Profile (dynamic, from assessments)
 * 3. AI Curriculum Composer (generates personalized curriculum)
 * 
 * DEPRECATED: Use generateAICurriculum from curriculum-composer-service.ts instead
 * This function is kept for backward compatibility.
 */
export async function generateCurriculumFromAssessment(
  childId: string,
  userId: string
): Promise<{ paths: Array<{ subjectId: string; subjectName: string; currentTopic: string; nextTopics: string[] }>; summary?: string }> {
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key is not configured. " +
      "Please set OPENAI_API_KEY in your environment variables. " +
      "Get your API key from: https://platform.openai.com/api-keys"
    )
  }
  
  const child = await prisma.child.findUnique({ where: { id: childId } })
  if (!child) throw new Error("Child not found")
  const resolvedUserId = await resolveParentUserId(childId)
  await enforceSubscriptionAccess({ userId: resolvedUserId, feature: "ai" })
  await enforceDailyLimit(resolvedUserId, "recommend-curriculum")

  const assessments = await prisma.assessment.findMany({
    where: { childId, status: "completed" },
    include: { subject: true, assessmentResult: true },
    orderBy: { createdAt: "desc" },
  })

  const input = assessments.map((a) => {
    const res = a.assessmentResult as { strengths?: string[]; weaknesses?: string[] } | null
    return {
      subjectId: a.subjectId,
      subjectName: a.subject?.name ?? "General",
      recommendedLevel: (a as { recommendedLevel?: string }).recommendedLevel ?? "beginner",
      strengths: (res?.strengths as string[]) ?? [],
      weaknesses: (res?.weaknesses as string[]) ?? [],
      suggestedTopics: [] as string[],
    }
  })

  if (input.length === 0) {
    return { paths: [] }
  }

  const prompt = buildCurriculumFromAssessmentPrompt({
    childName: child.name,
    ageGroup: toApiAgeGroup(child.ageGroup),
    learningStyle: child.learningStyle,
    assessments: input,
  })

  try {
    const result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: curriculumPlanSchema,
          prompt,
        }),
      {
        maxRetries: 3,
        retryDelay: 1000,
      }
    )

    await prisma.curriculumPath.deleteMany({ where: { childId } })

    const paths: Array<{ subjectId: string; subjectName: string; currentTopic: string; nextTopics: string[] }> = []
    for (const s of result.object.subjects) {
      await prisma.curriculumPath.create({
        data: {
          childId,
          subjectId: s.subject_id,
          currentTopic: s.current_topic,
          nextTopics: s.next_topics ?? [],
          masteryLevel: 50,
        },
      })
      paths.push({
        subjectId: s.subject_id,
        subjectName: s.subject_name,
        currentTopic: s.current_topic,
        nextTopics: s.next_topics ?? [],
      })
    }

    await logUsage({
      userId: resolvedUserId,
      feature: "regenerate-curriculum",
      eventData: { childId },
    })

    return { paths, summary: result.object.summary }
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 100) : "unknown")
    
    // Provide more specific error messages
    if (isSchemaValidationError(error)) {
      console.error("[Curriculum] JSON schema validation error:", {
        status: err?.status,
        message: err?.message,
        schema: "curriculumPlanSchema",
      })
      throw new Error(
        `Invalid JSON schema for curriculum generation (400 Bad Request). ` +
        `This indicates a schema validation issue. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    if (isRateLimitError(error)) {
      throw new Error(
        `OpenAI rate limit exceeded (429 Too Many Requests). ` +
        `Please wait a moment and try again. ` +
        `If this persists, check your OpenAI quota and billing.`
      )
    }
    
    if (err?.status === 400) {
      throw new Error(
        `Invalid request to OpenAI API (400 Bad Request). ` +
        `This usually means the prompt format is invalid or the schema doesn't match. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    throw new Error(
      `Failed to generate curriculum: ${hint}. ` +
      "Please check your OpenAI API key, quota, billing, and key restrictions."
    )
  }
}
