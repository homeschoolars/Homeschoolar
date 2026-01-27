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
import { openai, isOpenAIConfigured } from "@/lib/openai"
import {
  buildWorksheetPrompt,
  buildGradeSubmissionPrompt,
  buildGenerateQuizPrompt,
  buildGradeQuizPrompt,
  buildInitialAssessmentPrompt,
  buildCompleteAssessmentPrompt,
  buildRecommendCurriculumPrompt,
  buildCurriculumFromAssessmentPrompt,
} from "@/services/ai-prompts"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { updateLearningMemoryFromAssessment } from "@/services/memory-service"
import { upsertBehavioralMemory } from "@/services/memory-service"
import { STATIC_WORKSHEET_SYSTEM_PROMPT, STATIC_QUIZ_SYSTEM_PROMPT } from "@/lib/static-prompts"
import { TOKEN_LIMITS } from "@/lib/openai-cache"

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
  inferred_learning_style: z.enum(["visual", "auditory", "reading_writing", "kinesthetic", "mixed"]).optional(),
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

  if (
    (normalized.includes("english") || normalized.includes("language") || normalized.includes("literacy")) &&
    !normalized.includes("financial")
  ) {
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
      create("fallback-11", "multiple_choice", "What is the opposite of 'hot'?", "Cold", 3, ["Cold", "Warm", "Wet", "Big"], "antonyms"),
      create("fallback-12", "true_false", "True or False: A sentence must have a verb.", "True", 3, undefined, "sentence structure"),
      create("fallback-13", "multiple_choice", "Which is a proper noun?", "London", 3, ["city", "London", "place", "country"], "proper nouns"),
      create("fallback-14", "true_false", "True or False: 'Quickly' is an adverb.", "True", 3, undefined, "adverbs"),
      create("fallback-15", "multiple_choice", "What do we use at the end of a question?", "Question mark", 3, ["Period", "Comma", "Question mark", "Exclamation"], "punctuation"),
    ]
  }

  if (normalized.includes("art") || normalized.includes("creativity")) {
    return [
      create("fallback-1", "multiple_choice", "Which is a primary color?", "Red", 1, ["Red", "Green", "Orange", "Purple"], "color"),
      create("fallback-2", "true_false", "True or False: Artists use shapes to make pictures.", "True", 1, undefined, "art basics"),
      create("fallback-3", "multiple_choice", "What do we use to draw?", "Pencil", 2, ["Spoon", "Pencil", "Chair", "Water"], "materials"),
      create("fallback-4", "multiple_choice", "Mixing blue and yellow makes:", "Green", 2, ["Red", "Green", "Brown", "Pink"], "color mixing"),
      create("fallback-5", "true_false", "True or False: Dancing is a form of art.", "True", 2, undefined, "art forms"),
      create("fallback-6", "multiple_choice", "Which shape has no corners?", "Circle", 2, ["Square", "Triangle", "Circle", "Rectangle"], "shapes"),
      create("fallback-7", "true_false", "True or False: We can use recycled materials for art.", "True", 3, undefined, "creativity"),
      create("fallback-8", "multiple_choice", "What helps us create patterns?", "Repetition", 3, ["Repetition", "Eating", "Sleeping", "Running"], "patterns"),
      create("fallback-9", "true_false", "True or False: Music is a type of art.", "True", 3, undefined, "art forms"),
      create("fallback-10", "multiple_choice", "Which is used for painting?", "Brush", 3, ["Brush", "Fork", "Ruler", "Eraser"], "materials"),
      create("fallback-11", "multiple_choice", "Drawing from imagination is called:", "Creative", 3, ["Creative", "Boring", "Easy", "Hard"], "creativity"),
      create("fallback-12", "true_false", "True or False: Everyone can be an artist.", "True", 3, undefined, "art confidence"),
      create("fallback-13", "multiple_choice", "Which is a cool color?", "Blue", 3, ["Red", "Orange", "Blue", "Yellow"], "color"),
      create("fallback-14", "true_false", "True or False: Art can show feelings.", "True", 3, undefined, "expression"),
      create("fallback-15", "multiple_choice", "What do we call a picture of yourself?", "Self-portrait", 3, ["Landscape", "Self-portrait", "Still life", "Abstract"], "art types"),
    ]
  }

  if (normalized.includes("life") || normalized.includes("skill")) {
    return [
      create("fallback-1", "multiple_choice", "We should brush our teeth:", "Twice a day", 1, ["Once a week", "Twice a day", "Never", "Once a month"], "hygiene"),
      create("fallback-2", "true_false", "True or False: Saying please and thank you is polite.", "True", 1, undefined, "manners"),
      create("fallback-3", "multiple_choice", "What should we do before eating?", "Wash hands", 2, ["Wash hands", "Run", "Watch TV", "Sleep"], "hygiene"),
      create("fallback-4", "multiple_choice", "Who do we ask when we need help?", "A trusted adult", 2, ["A stranger", "A trusted adult", "Nobody", "A pet"], "safety"),
      create("fallback-5", "true_false", "True or False: We should share with others.", "True", 2, undefined, "sharing"),
      create("fallback-6", "multiple_choice", "What helps us stay healthy?", "Exercise", 2, ["Exercise", "Too much candy", "No sleep", "Sitting all day"], "health"),
      create("fallback-7", "true_false", "True or False: It is good to listen when others speak.", "True", 3, undefined, "listening"),
      create("fallback-8", "multiple_choice", "When we make a mistake, we should:", "Say sorry and try again", 3, ["Hide it", "Say sorry and try again", "Blame others", "Give up"], "responsibility"),
      create("fallback-9", "true_false", "True or False: Cleaning up our toys is responsible.", "True", 3, undefined, "responsibility"),
      create("fallback-10", "multiple_choice", "What do we use to tell time?", "Clock", 3, ["Clock", "Chair", "Apple", "Ball"], "daily skills"),
      create("fallback-11", "true_false", "True or False: Being kind makes others feel good.", "True", 3, undefined, "kindness"),
      create("fallback-12", "multiple_choice", "Before crossing the road we:", "Look both ways", 3, ["Run", "Look both ways", "Close eyes", "Listen to music"], "safety"),
      create("fallback-13", "true_false", "True or False: We should drink water every day.", "True", 3, undefined, "health"),
      create("fallback-14", "multiple_choice", "What helps us stay calm when upset?", "Taking deep breaths", 3, ["Shouting", "Taking deep breaths", "Hiding", "Blame"], "emotional skills"),
      create("fallback-15", "true_false", "True or False: Helping at home is a good habit.", "True", 3, undefined, "habits"),
    ]
  }

  if (normalized.includes("physical") || normalized.includes("education") || normalized.includes("fitness") || normalized.includes("wellness")) {
    return [
      create("fallback-1", "multiple_choice", "Running helps our:", "Heart", 1, ["Heart", "Ears", "Eyes", "Hair"], "fitness"),
      create("fallback-2", "true_false", "True or False: Exercise keeps us healthy.", "True", 1, undefined, "fitness"),
      create("fallback-3", "multiple_choice", "We should drink water when we:", "Exercise", 2, ["Sleep", "Exercise", "Read", "Draw"], "hydration"),
      create("fallback-4", "multiple_choice", "Which is a form of exercise?", "Jumping", 2, ["Jumping", "Sitting", "Sleeping", "Watching TV"], "exercise"),
      create("fallback-5", "true_false", "True or False: Stretching before exercise is good.", "True", 2, undefined, "warm-up"),
      create("fallback-6", "multiple_choice", "What do our muscles need to grow?", "Exercise and food", 2, ["Only sleep", "Exercise and food", "Only TV", "Sugar"], "muscles"),
      create("fallback-7", "true_false", "True or False: Playing outside is good for us.", "True", 3, undefined, "outdoor play"),
      create("fallback-8", "multiple_choice", "Which sport uses a ball?", "Soccer", 3, ["Soccer", "Swimming", "Running", "Cycling"], "sports"),
      create("fallback-9", "true_false", "True or False: Rest is important after exercise.", "True", 3, undefined, "rest"),
      create("fallback-10", "multiple_choice", "What helps us balance?", "Practice", 3, ["Practice", "Sitting", "Eating", "Sleeping"], "balance"),
      create("fallback-11", "true_false", "True or False: We should warm up before playing.", "True", 3, undefined, "warm-up"),
      create("fallback-12", "multiple_choice", "Sleep helps our body:", "Recover", 3, ["Recover", "Shrink", "Stay awake", "Forget"], "rest"),
      create("fallback-13", "true_false", "True or False: Team sports teach us to work together.", "True", 3, undefined, "teamwork"),
      create("fallback-14", "multiple_choice", "Which is a healthy snack?", "Fruit", 3, ["Fruit", "Candy only", "Chips only", "Soda"], "nutrition"),
      create("fallback-15", "true_false", "True or False: Moving our body every day is important.", "True", 3, undefined, "activity"),
    ]
  }

  if (normalized.includes("financial") || normalized.includes("money") || normalized.includes("literacy")) {
    return [
      create("fallback-1", "multiple_choice", "Money is used to:", "Buy things", 1, ["Eat", "Buy things", "Sleep", "Run"], "money basics"),
      create("fallback-2", "true_false", "True or False: We should save some money.", "True", 1, undefined, "saving"),
      create("fallback-3", "multiple_choice", "A piggy bank helps us:", "Save money", 2, ["Save money", "Cook", "Draw", "Sleep"], "saving"),
      create("fallback-4", "multiple_choice", "When we want something expensive we:", "Save over time", 2, ["Give up", "Save over time", "Steal", "Cry"], "saving"),
      create("fallback-5", "true_false", "True or False: Needs are more important than wants.", "True", 2, undefined, "needs vs wants"),
      create("fallback-6", "multiple_choice", "Which is a need?", "Food", 2, ["Food", "Toys", "Video games", "Candy"], "needs vs wants"),
      create("fallback-7", "true_false", "True or False: Sharing money to help others is kind.", "True", 3, undefined, "giving"),
      create("fallback-8", "multiple_choice", "Earning money means:", "Getting paid for work", 3, ["Stealing", "Getting paid for work", "Finding it", "Asking only"], "earning"),
      create("fallback-9", "true_false", "True or False: We should not spend all our money at once.", "True", 3, undefined, "budgeting"),
      create("fallback-10", "multiple_choice", "What helps us plan our spending?", "A budget", 3, ["A budget", "A toy", "A game", "A song"], "budgeting"),
      create("fallback-11", "true_false", "True or False: Delaying a want to save is smart.", "True", 3, undefined, "delayed gratification"),
      create("fallback-12", "multiple_choice", "Which helps us save?", "Putting coins in a jar", 3, ["Putting coins in a jar", "Buying everything", "Losing money", "Not caring"], "saving"),
      create("fallback-13", "true_false", "True or False: We should compare prices before buying.", "True", 3, undefined, "smart spending"),
      create("fallback-14", "multiple_choice", "Donating to help others is:", "Generous", 3, ["Generous", "Wrong", "Strange", "Bad"], "giving"),
      create("fallback-15", "true_false", "True or False: Learning about money is useful.", "True", 3, undefined, "financial literacy"),
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

export async function generateWorksheet(body: GenerateWorksheetRequest, userId: string) {
  const { subject_id, subject_name, age_group, difficulty, topic, num_questions = 5, child_level } = body
  
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API key is not configured. " +
      "Please set OPENAI_API_KEY in your environment variables. " +
      "Get your API key from: https://platform.openai.com/api-keys"
    )
  }
  
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

  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: worksheetSchema,
      prompt,
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
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 100) : "unknown")
    
    // Provide more specific error messages
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
    model: openai("gpt-4o-mini"),
    schema: gradingSchema,
    prompt,
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

  // Build segmented prompt: static (cacheable) + dynamic (non-cached)
  const dynamicPrompt = buildGenerateQuizPrompt({
    ageGroup: age_group,
    subjectName: targetSubject || "General Knowledge",
    recentTopics: recent_topics,
  })

  const fullPrompt = `${STATIC_QUIZ_SYSTEM_PROMPT}\n\n${dynamicPrompt}`

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: quizSchema,
    prompt: fullPrompt,
    maxTokens: TOKEN_LIMITS.quiz.maxOutputTokens,
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
    model: openai("gpt-4o-mini"),
    schema: quizGradingSchema,
    prompt,
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

  let source: "ai" | "fallback" = "ai"
    let fallback_reason: "openai_unconfigured" | "openai_error" | null = null
  if (!isOpenAIConfigured()) {
    console.warn(
      "[Assessment] OPENAI_API_KEY missing or placeholder. Using fallback questions. " +
        "Set it in .env.local (local) or Cloud Run / Vercel env vars (production). Check GET /api/health → openai_configured."
    )
    questions = buildFallbackAssessmentQuestions(subject_name)
    source = "fallback"
    fallback_reason = "openai_unconfigured"
  } else {
    try {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: assessmentSchema,
        prompt,
        maxTokens: TOKEN_LIMITS.quiz.maxOutputTokens, // Similar structure to quiz
      })
      questions = result.object.questions
    } catch (error) {
      const err = error as { status?: number; code?: string; message?: string }
      const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 80) : "unknown")
      console.error(
        `[Assessment] OpenAI API error (${hint}). Using fallback questions. Check quota, billing, and key restrictions.`,
        error
      )
      questions = buildFallbackAssessmentQuestions(subject_name)
      source = "fallback"
      fallback_reason = "openai_error"
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
    eventData: { childId: child_id, subjectId: subject_id, source, fallback_reason: fallback_reason ?? undefined },
  })

  return { assessment, source, fallback_reason: fallback_reason ?? undefined }
}

export async function completeAssessment({
  assessment_id,
  answers,
  age_group,
  is_last_subject = false,
}: {
  assessment_id: string
  answers: Answer[]
  age_group: string
  is_last_subject?: boolean
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
    model: openai("gpt-4o-mini"),
    schema: assessmentResultSchema,
    prompt,
  })

  const maxScore = questions.reduce((sum, q) => sum + (q.points ?? 0), 0)
  const normalizedScore = maxScore > 0 ? Math.round((result.object.score / maxScore) * 100) : 0
  const topics = result.object.suggested_starting_topics ?? []
  const firstTopic = topics[0] ?? null
  const restTopics = topics.slice(1)

  await prisma.assessment.update({
    where: { id: assessment_id },
    data: {
      answers: answers as unknown as object,
      score: result.object.score,
      recommendedLevel: result.object.recommended_level,
      completedAt: new Date(),
    },
  })

  await prisma.assessmentResult.upsert({
    where: { assessmentId: assessment_id },
    update: {
      rawScore: result.object.score,
      normalizedScore,
      strengths: (result.object.strengths ?? []) as unknown as object,
      weaknesses: (result.object.areas_to_work_on ?? []) as unknown as object,
      aiSummary: result.object.analysis ?? null,
      evaluatedAt: new Date(),
    },
    create: {
      assessmentId: assessment_id,
      rawScore: result.object.score,
      normalizedScore,
      strengths: (result.object.strengths ?? []) as unknown as object,
      weaknesses: (result.object.areas_to_work_on ?? []) as unknown as object,
      aiSummary: result.object.analysis ?? null,
    },
  })

  await updateLearningMemoryFromAssessment({
    childId: assessment.childId,
    subjectId: assessment.subjectId,
    strengths: (result.object.strengths ?? []).map((s) => ({ concept: s, evidence: "Initial assessment" })),
    weaknesses: (result.object.areas_to_work_on ?? []).map((w) => ({ concept: w, evidence: "Initial assessment" })),
  })

  if (result.object.inferred_learning_style) {
    await upsertBehavioralMemory({
      childId: assessment.childId,
      learningStyle: result.object.inferred_learning_style,
    })
  }

  await prisma.child.update({
    where: { id: assessment.childId },
    data: {
      currentLevel: result.object.recommended_level as LearningLevel,
      ...(result.object.inferred_learning_style
        ? { learningStyle: result.object.inferred_learning_style }
        : {}),
      ...(is_last_subject ? { assessmentCompleted: true } : {}),
    },
  })

  await prisma.curriculumPath.upsert({
    where: { childId_subjectId: { childId: assessment.childId, subjectId: assessment.subjectId } },
    update: {
      currentTopic: firstTopic,
      nextTopics: restTopics,
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
      currentTopic: firstTopic,
      nextTopics: restTopics,
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

  if (is_last_subject) {
    try {
      await generateCurriculumFromAssessment(assessment.childId, resolvedUserId)
    } catch (e) {
      console.error("Auto-generate curriculum from assessment failed:", e)
    }
  }

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
    model: openai("gpt-4o-mini"),
    schema: recommendationSchema,
    prompt,
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

/** Generate or regenerate curriculum plan from stored assessments. Used after assessment and when parent clicks Regenerate. */
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
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: curriculumPlanSchema,
      prompt,
    })

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
