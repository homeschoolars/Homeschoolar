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
  LearningLevel,
} from "@/lib/types"
import { google } from "@ai-sdk/google"
import {
  buildWorksheetPrompt,
  buildGradeSubmissionPrompt,
  buildGenerateQuizPrompt,
  buildGradeQuizPrompt,
  buildInitialAssessmentPrompt,
  buildCompleteAssessmentPrompt,
  buildRecommendCurriculumPrompt,
} from "@/services/ai-prompts"

const DAILY_AI_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? "50")

async function enforceDailyLimit(userId: string | null, feature: string) {
  if (!userId) return
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

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "text", "true_false", "fill_blank"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  points: z.number(),
  hint: z.string().optional(),
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
      options: z.array(z.string()).optional(),
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

const assessmentSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["multiple_choice", "true_false"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      correct_answer: z.string(),
      points: z.number(),
      skill_tested: z.string(),
    }),
  ),
})

const assessmentResultSchema = z.object({
  score: z.number(),
  max_score: z.number(),
  recommended_level: z.enum(["beginner", "intermediate", "advanced"]),
  analysis: z.string(),
  strengths: z.array(z.string()),
  areas_to_work_on: z.array(z.string()),
  suggested_starting_topics: z.array(z.string()),
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

export async function generateWorksheet(body: GenerateWorksheetRequest, userId: string) {
  const { subject_id, subject_name, age_group, difficulty, topic, num_questions = 5, child_level } = body
  const prompt = buildWorksheetPrompt({
    subjectName: subject_name,
    ageGroup: age_group,
    difficulty,
    topic,
    numQuestions: num_questions,
    childLevel: child_level,
  })

  await enforceDailyLimit(userId, "generate-worksheet")

  const result = await generateObject({
    model: "google/gemini-2.0-flash",
    schema: worksheetSchema,
    prompt,
    maxOutputTokens: 4000,
  })

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
      isApproved: false,
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
}

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

  await enforceDailyLimit(userId, "grade-submission")

  const result = await generateObject({
    model: "google/gemini-2.0-flash",
    schema: gradingSchema,
    prompt,
    maxOutputTokens: 3000,
  })

  await logUsage({
    userId,
    feature: "grade-submission",
    eventData: { worksheetId: worksheet.id, ageGroup: child_age_group },
  })

  return result.object
}

export async function generateQuiz({
  child_id,
  subject_id,
  subject_name,
  age_group,
  recent_topics,
  userId,
}: {
  child_id: string
  subject_id?: string
  subject_name?: string
  age_group: AgeGroup
  recent_topics?: string[]
  userId?: string
}) {
  const resolvedUserId = userId ?? (await getParentIdFromChild(child_id))
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

  const prompt = buildGenerateQuizPrompt({
    ageGroup: age_group,
    subjectName: targetSubject || "General Knowledge",
    recentTopics: recent_topics,
  })

  const result = await generateObject({
    model: google("gemini-1.5-flash"),
    schema: quizSchema,
    prompt,
    maxOutputTokens: 2000,
  })

  const maxScore = result.object.questions.reduce((sum, q) => sum + q.points, 0)

  const quiz = await prisma.surpriseQuiz.create({
    data: {
      childId: child_id,
      subjectId: targetSubjectId,
      questions: result.object.questions,
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

export async function gradeQuiz({
  quiz_id,
  answers,
  age_group,
  userId,
}: {
  quiz_id: string
  answers: Answer[]
  age_group: string
  userId?: string
}) {
  const quiz = await prisma.surpriseQuiz.findUnique({ where: { id: quiz_id } })
  if (!quiz) {
    throw new Error("Quiz not found")
  }
  const resolvedUserId = userId ?? (await getParentIdFromChild(quiz.childId))
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

  const result = await generateObject({
    model: "google/gemini-2.0-flash",
    schema: quizGradingSchema,
    prompt,
    maxOutputTokens: 1500,
  })

  await prisma.surpriseQuiz.update({
    where: { id: quiz_id },
    data: {
      answers: answers as unknown as object,
      score: result.object.score,
      feedback: result.object.overall_feedback,
      completedAt: new Date(),
    },
  })

  await logUsage({
    userId: resolvedUserId,
    feature: "grade-quiz",
    eventData: { quizId: quiz_id, ageGroup: age_group },
  })

  return { ...result.object, max_score: quiz.maxScore }
}

export async function generateInitialAssessment({
  child_id,
  subject_id,
  subject_name,
  age_group,
  userId,
}: {
  child_id: string
  subject_id: string
  subject_name: string
  age_group: AgeGroup
  userId?: string
}) {
  const resolvedUserId = userId ?? (await getParentIdFromChild(child_id))
  await enforceDailyLimit(resolvedUserId, "initial-assessment")

  const prompt = buildInitialAssessmentPrompt({ ageGroup: age_group, subjectName: subject_name })

  const result = await generateObject({
    model: google("gemini-1.5-flash"),
    schema: assessmentSchema,
    prompt,
    maxOutputTokens: 3000,
  })

  const assessment = await prisma.assessment.create({
    data: {
      childId: child_id,
      subjectId: subject_id,
      questions: result.object.questions,
    },
  })

  await logUsage({
    userId: resolvedUserId,
    feature: "initial-assessment",
    eventData: { childId: child_id, subjectId: subject_id },
  })

  return assessment
}

export async function completeAssessment({
  assessment_id,
  answers,
  age_group,
  userId,
}: {
  assessment_id: string
  answers: Answer[]
  age_group: string
  userId?: string
}) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessment_id },
    include: { subject: true },
  })

  if (!assessment) {
    throw new Error("Assessment not found")
  }

  const questions = assessment.questions as unknown as (QuizQuestion & { skill_tested: string })[]
  const questionsWithAnswers = questions.map((q) => {
    const studentAnswer = answers.find((a) => a.question_id === q.id)
    return {
      question: q.question,
      correct_answer: q.correct_answer,
      student_answer: studentAnswer?.answer || "Not answered",
      points: q.points,
      skill_tested: q.skill_tested,
    }
  })

  const resolvedUserId = userId ?? (await getParentIdFromChild(assessment.childId))
  await enforceDailyLimit(resolvedUserId, "complete-assessment")

  const prompt = buildCompleteAssessmentPrompt({
    ageGroup: age_group,
    subjectName: assessment.subject?.name || "General",
    questions: questionsWithAnswers,
  })

  const result = await generateObject({
    model: "google/gemini-2.0-flash",
    schema: assessmentResultSchema,
    prompt,
    maxOutputTokens: 2000,
  })

  await prisma.assessment.update({
    where: { id: assessment_id },
    data: {
      answers: answers as unknown as object,
      score: result.object.score,
      recommendedLevel: result.object.recommended_level,
      completedAt: new Date(),
    },
  })

  await prisma.child.update({
    where: { id: assessment.childId },
    data: {
      currentLevel: result.object.recommended_level as LearningLevel,
      assessmentCompleted: true,
    },
  })

  await prisma.curriculumPath.upsert({
    where: { childId_subjectId: { childId: assessment.childId, subjectId: assessment.subjectId } },
    update: {
      currentTopic: result.object.suggested_starting_topics[0],
      nextTopics: result.object.suggested_starting_topics.slice(1),
      masteryLevel:
        result.object.recommended_level === "beginner"
          ? 0
          : result.object.recommended_level === "intermediate"
            ? 40
            : 70,
    },
    create: {
      childId: assessment.childId,
      subjectId: assessment.subjectId,
      currentTopic: result.object.suggested_starting_topics[0],
      nextTopics: result.object.suggested_starting_topics.slice(1),
      masteryLevel:
        result.object.recommended_level === "beginner"
          ? 0
          : result.object.recommended_level === "intermediate"
            ? 40
            : 70,
    },
  })

  await logUsage({
    userId: resolvedUserId,
    feature: "complete-assessment",
    eventData: { assessmentId: assessment_id, ageGroup: age_group },
  })

  return result.object
}

export async function recommendCurriculum({ child_id, userId }: { child_id: string; userId?: string }) {
  const child = await prisma.child.findUnique({ where: { id: child_id } })
  if (!child) {
    throw new Error("Child not found")
  }
  const resolvedUserId = userId ?? (await getParentIdFromChild(child_id))
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

  const result = await generateObject({
    model: "google/gemini-2.0-flash",
    schema: recommendationSchema,
    prompt,
    maxOutputTokens: 2000,
  })

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
