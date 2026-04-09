export type QuizQuestionType =
  | "mcq"
  | "scale"
  | "open"
  | "scenario"
  | "image_choice"
  | "observation_scale"
  | "observation_mcq"
  | "observation_open"

export type QuizQuestion = {
  id: string
  type: QuizQuestionType
  signal: "academic" | "iq" | "eq" | "mental_health" | "interest"
  question: string
  options: string[] | null
  scaleMin: string | null
  scaleMax: string | null
  scoringKey: Record<string, number> | null
  openScoring: "length_and_depth" | "vocabulary_level" | "emotional_insight" | null
}

export type AssessmentQuizSubject = {
  subject: string
  label: string
  category: "core" | "future" | "creative" | "life"
  color: string
  questions: QuizQuestion[]
}

export type AssessmentQuiz = {
  quizId: string
  age: number
  childName: string
  mode: "parent" | "student"
  totalQuestions: number
  subjects: AssessmentQuizSubject[]
}

export type AssessmentReport = {
  childName: string
  age: number
  completedAt: string
  subjectScores: Array<{
    subject: string
    label: string
    score: number
    level: "strong" | "developing" | "needs_support"
    observation: string
  }>
  iqEstimate: { score: number; category: string; explanation: string }
  eqEstimate: { score: number; category: string; explanation: string }
  mentalHealthSnapshot: { overall: string; note: string }
  interestProfile: {
    primary: string
    secondary: string
    confidence: number
    narrative: string
  }
  learningProfile: {
    learnerType: string
    preferredStyle: string
    paceType: string
    narrative: string
  }
  hiddenDifficultyLevel: { level: number; label: string; reasoning: string }
  strongSubjects: string[]
  weakSubjects: string[]
  recommendations: Array<{
    icon: string
    title: string
    detail: string
    linkedSubject: string
  }>
  parentMessage: string
  overallSummary: string
}

export type AssessmentReportPublic = Omit<AssessmentReport, "hiddenDifficultyLevel">
