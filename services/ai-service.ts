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
import { enforceSubscriptionAccess } from "@/services/subscription-access"

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

function buildFallbackAssessmentQuestions(subjectName: string) {
  const normalized = subjectName.toLowerCase()
  const base = subjectName.split("(")[0].trim() || "this subject"

  const create = (
    id: string,
    type: "multiple_choice" | "true_false",
    question: string,
    correct_answer: string,
    points: number,
    options?: string[],
    skill_tested = "core concepts",
  ) => ({
    id,
    type,
    question,
    options,
    correct_answer,
    points,
    skill_tested,
  })

  if (normalized.includes("math")) {
    return [
      create("fallback-1", "multiple_choice", "What is 2 + 2?", "4", 1, ["3", "4", "5", "6"], "addition"),
      create("fallback-2", "multiple_choice", "What is 5 - 3?", "2", 1, ["1", "2", "3", "4"], "subtraction"),
      create("fallback-3", "multiple_choice", "What is 3 × 2?", "6", 2, ["5", "6", "7", "8"], "multiplication"),
      create("fallback-4", "true_false", "True or False: 9 is greater than 12.", "False", 2, undefined, "number comparison"),
      create("fallback-5", "multiple_choice", "Which shape has 3 sides?", "Triangle", 2, ["Square", "Circle", "Triangle", "Rectangle"], "shapes"),
      create("fallback-6", "multiple_choice", "If you have 1 apple and get 2 more, how many apples?", "3", 2, ["2", "3", "4", "5"], "addition"),
      create("fallback-7", "true_false", "True or False: 0 is less than 1.", "True", 2, undefined, "number sense"),
      create("fallback-8", "multiple_choice", "What is 7 + 1?", "8", 3, ["7", "8", "9", "10"], "addition"),
      create("fallback-9", "multiple_choice", "What is 10 ÷ 2?", "5", 3, ["4", "5", "6", "7"], "division"),
      create("fallback-10", "multiple_choice", "Which number is even?", "6", 3, ["5", "6", "7", "9"], "even/odd"),
      create("fallback-11", "multiple_choice", "What is 4 × 3?", "12", 3, ["10", "11", "12", "13"], "multiplication"),
      create("fallback-12", "true_false", "True or False: 15 − 7 = 8.", "True", 3, undefined, "subtraction"),
      create("fallback-13", "multiple_choice", "How many sides does a hexagon have?", "6", 3, ["5", "6", "7", "8"], "shapes"),
      create("fallback-14", "multiple_choice", "What is 20 ÷ 4?", "5", 3, ["4", "5", "6", "7"], "division"),
      create("fallback-15", "true_false", "True or False: 9 × 2 = 18.", "True", 3, undefined, "multiplication"),
    ]
  }

  if (normalized.includes("science")) {
    return [
      create(
        "fallback-1",
        "multiple_choice",
        "Which of these is a living thing?",
        "Tree",
        1,
        ["Rock", "Tree", "Chair", "Cloud"],
        "living vs non-living",
      ),
      create("fallback-2", "true_false", "True or False: The sun is a star.", "True", 1, undefined, "basic astronomy"),
      create(
        "fallback-3",
        "multiple_choice",
        "Which of these is a planet?",
        "Earth",
        2,
        ["Earth", "Sun", "Moon", "Star"],
        "space science",
      ),
      create("fallback-4", "multiple_choice", "Water freezes into:", "Ice", 2, ["Steam", "Ice", "Clouds", "Rain"], "states of matter"),
      create(
        "fallback-5",
        "true_false",
        "True or False: Plants need sunlight to grow.",
        "True",
        2,
        undefined,
        "plant needs",
      ),
      create("fallback-6", "multiple_choice", "Which sense helps you hear?", "Ears", 2, ["Eyes", "Ears", "Nose", "Hands"], "senses"),
      create(
        "fallback-7",
        "true_false",
        "True or False: Fish breathe with lungs like humans.",
        "False",
        3,
        undefined,
        "animal science",
      ),
      create("fallback-8", "multiple_choice", "Which of these is a gas?", "Air", 3, ["Air", "Water", "Ice", "Wood"], "states of matter"),
      create(
        "fallback-9",
        "multiple_choice",
        "Which part of a plant absorbs water?",
        "Roots",
        3,
        ["Leaves", "Roots", "Flowers", "Stem"],
        "plant parts",
      ),
      create(
        "fallback-10",
        "true_false",
        "True or False: Washing hands helps keep us healthy.",
        "True",
        3,
        undefined,
        "health & hygiene",
      ),
      create("fallback-11", "multiple_choice", "Which organ pumps blood?", "Heart", 3, ["Brain", "Heart", "Lungs", "Stomach"], "human body"),
      create("fallback-12", "true_false", "True or False: Sound travels faster than light.", "False", 3, undefined, "physics basics"),
      create("fallback-13", "multiple_choice", "What do plants release that we breathe?", "Oxygen", 3, ["Carbon dioxide", "Oxygen", "Nitrogen", "Water vapor"], "plant science"),
      create("fallback-14", "multiple_choice", "Which is a form of energy?", "Light", 3, ["Light", "Rock", "Water", "Sand"], "energy"),
      create("fallback-15", "true_false", "True or False: Fossils tell us about the past.", "True", 3, undefined, "earth science"),
    ]
  }

  if (normalized.includes("english") || normalized.includes("language") || normalized.includes("literacy")) {
    return [
      create("fallback-1", "multiple_choice", "Which word is a noun?", "Cat", 1, ["Cat", "Run", "Quickly", "Blue"], "nouns"),
      create("fallback-2", "multiple_choice", "Which word is a verb?", "Run", 1, ["Happy", "Run", "Blue", "Tall"], "verbs"),
      create("fallback-3", "true_false", "True or False: 'Happy' is an adjective.", "True", 2, undefined, "adjectives"),
      create("fallback-4", "multiple_choice", "What is the plural of 'book'?", "Books", 2, ["Book", "Books", "Bookes", "Book's"], "plurals"),
      create("fallback-5", "multiple_choice", "Which letter is a vowel?", "A", 2, ["B", "C", "A", "D"], "phonics"),
      create(
        "fallback-6",
        "true_false",
        "True or False: A sentence should start with a capital letter.",
        "True",
        2,
        undefined,
        "capitalization",
      ),
      create("fallback-7", "multiple_choice", "Which word means the same as 'big'?", "Large", 3, ["Tiny", "Large", "Small", "Short"], "synonyms"),
      create("fallback-8", "multiple_choice", "Which is a punctuation mark?", "Period", 3, ["Letter", "Word", "Period", "Sound"], "punctuation"),
      create("fallback-9", "true_false", "True or False: 'They is' is correct grammar.", "False", 3, undefined, "grammar"),
      create("fallback-10", "multiple_choice", "Choose the correct word: I ___ happy.", "am", 3, ["am", "is", "are", "be"], "grammar"),
    ]
  }

  if (normalized.includes("social") || normalized.includes("history") || normalized.includes("geography")) {
    return [
      create("fallback-1", "multiple_choice", "A map shows:", "Places", 1, ["Recipes", "Places", "Music", "Stories"], "maps"),
      create("fallback-2", "true_false", "True or False: A city is smaller than a town.", "False", 1, undefined, "communities"),
      create(
        "fallback-3",
        "multiple_choice",
        "Which is a community helper?",
        "Firefighter",
        2,
        ["Firefighter", "Painter", "Runner", "Singer"],
        "community helpers",
      ),
      create(
        "fallback-4",
        "multiple_choice",
        "A flag is a symbol of a:",
        "Country",
        2,
        ["Animal", "Country", "Book", "Game"],
        "symbols",
      ),
      create(
        "fallback-5",
        "true_false",
        "True or False: We should follow traffic rules.",
        "True",
        2,
        undefined,
        "citizenship",
      ),
      create("fallback-6", "multiple_choice", "Which is a continent?", "Asia", 2, ["Asia", "Nile", "Sahara", "Amazon"], "continents"),
      create("fallback-7", "multiple_choice", "Which is an ocean?", "Pacific", 3, ["Pacific", "Everest", "Nile", "Sahara"], "oceans"),
      create("fallback-8", "true_false", "True or False: Earth has one moon.", "True", 3, undefined, "Earth & space"),
      create(
        "fallback-9",
        "multiple_choice",
        "People who live in the same area are called:",
        "Community",
        3,
        ["Community", "Mountains", "Weather", "Animals"],
        "community",
      ),
      create(
        "fallback-10",
        "true_false",
        "True or False: A globe is a model of Earth.",
        "True",
        3,
        undefined,
        "geography basics",
      ),
    ]
  }

  return [
    create(
      "fallback-1",
      "multiple_choice",
      `Which option is most related to ${base}?`,
      base,
      1,
      [base, "Music", "Art", "Sports"],
      "subject awareness",
    ),
    create("fallback-2", "multiple_choice", "Which number is bigger?", "8", 1, ["8", "3", "1", "2"], "number sense"),
    create("fallback-3", "true_false", "True or False: 5 is greater than 9.", "False", 2, undefined, "number comparison"),
    create("fallback-4", "multiple_choice", "Which shape has 4 sides?", "Square", 2, ["Circle", "Triangle", "Square", "Star"], "shapes"),
    create("fallback-5", "multiple_choice", "What comes after 6?", "7", 2, ["5", "6", "7", "8"], "counting"),
    create("fallback-6", "true_false", "True or False: We should be kind to others.", "True", 2, undefined, "character"),
    create("fallback-7", "multiple_choice", "Which is a healthy habit?", "Washing hands", 3, ["Washing hands", "Skipping sleep", "Not drinking water", "Too much candy"], "health"),
    create("fallback-8", "multiple_choice", "Which is used to write?", "Pencil", 3, ["Pencil", "Shoe", "Ball", "Cup"], "everyday tools"),
    create("fallback-9", "true_false", "True or False: The sky is usually blue on a clear day.", "True", 3, undefined, "observations"),
    create("fallback-10", "multiple_choice", "Which is a living thing?", "Dog", 3, ["Rock", "Dog", "Chair", "Cloud"], "living vs non-living"),
  ]
}

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

  await enforceSubscriptionAccess({ userId, feature: "ai" })
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

  await enforceSubscriptionAccess({ userId, feature: "ai" })
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
}: {
  child_id: string
  subject_id: string
  subject_name: string
  age_group: AgeGroup
}) {
  const resolvedUserId = await resolveParentUserId(child_id)
  await enforceSubscriptionAccess({ userId: resolvedUserId, feature: "ai" })
  await enforceDailyLimit(resolvedUserId, "initial-assessment")

  const prompt = buildInitialAssessmentPrompt({ ageGroup: age_group, subjectName: subject_name })

  let questions: Array<{
    id: string
    type: "multiple_choice" | "true_false"
    question: string
    options?: string[]
    correct_answer: string
    points: number
    skill_tested: string
  }> = []

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    questions = buildFallbackAssessmentQuestions(subject_name)
  } else {
    try {
      const result = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: assessmentSchema,
        prompt,
        maxOutputTokens: 3000,
      })
      questions = result.object.questions
    } catch (error) {
      console.error("AI assessment generation failed. Using fallback questions.", error)
      questions = buildFallbackAssessmentQuestions(subject_name)
    }
  }

  const assessment = await prisma.assessment.create({
    data: {
      childId: child_id,
      subjectId: subject_id,
      questions,
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
}: {
  assessment_id: string
  answers: Answer[]
  age_group: string
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

  const resolvedUserId = await resolveParentUserId(assessment.childId)
  await enforceSubscriptionAccess({ userId: resolvedUserId, feature: "ai" })
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
