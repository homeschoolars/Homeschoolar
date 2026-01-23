export type UserRole = "parent" | "admin" | "student"
export type AgeGroup = "4-5" | "6-7" | "8-9" | "10-11" | "12-13"
export type Difficulty = "easy" | "medium" | "hard"
export type AssignmentStatus = "pending" | "in_progress" | "completed" | "graded"
export type SubscriptionPlan = "trial" | "monthly" | "yearly"
export type SubscriptionStatus = "pending" | "active" | "cancelled" | "expired" | "past_due"
export type LearningLevel = "beginner" | "intermediate" | "advanced"
export type RecommendationType = "subject" | "topic" | "worksheet" | "activity"
export type QuestionType = "multiple_choice" | "text" | "true_false" | "fill_blank"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  parent_id: string
  name: string
  age_group: AgeGroup
  avatar_url: string | null
  login_code: string
  current_level: LearningLevel
  learning_style: string | null
  interests: string[] | null
  assessment_completed: boolean
  last_quiz_at: string | null
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  created_at: string
}

export interface Worksheet {
  id: string
  title: string
  description: string | null
  subject_id: string
  age_group: AgeGroup
  difficulty: Difficulty
  questions: Question[]
  answer_key: AnswerKey[] | null
  explanations: QuestionExplanation[] | null
  ai_prompt: string | null
  is_ai_generated: boolean
  is_approved: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correct_answer: string
  points: number
  hint?: string
}

export interface AnswerKey {
  question_id: string
  answer: string
  explanation: string
}

export interface QuestionExplanation {
  question_id: string
  step_by_step: string[]
  concept: string
  tips: string[]
}

export interface WorksheetAssignment {
  id: string
  worksheet_id: string
  child_id: string
  assigned_by: string
  due_date: string | null
  status: AssignmentStatus
  created_at: string
  worksheet?: Worksheet
}

export interface WorksheetSubmission {
  id: string
  assignment_id: string
  child_id: string
  answers: Answer[]
  score: number | null
  max_score: number | null
  ai_feedback: string | null
  submitted_at: string
  graded_at: string | null
}

export interface Answer {
  question_id: string
  answer: string
  is_correct?: boolean
  feedback?: string
}

export interface Progress {
  id: string
  child_id: string
  subject_id: string
  total_worksheets: number
  completed_worksheets: number
  total_score: number
  average_score: number
  last_activity_at: string | null
  updated_at: string
  subject?: Subject
}

export interface Subscription {
  id: string
  user_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "achievement"
  is_read: boolean
  created_at: string
}

export interface Assessment {
  id: string
  child_id: string
  subject_id: string
  questions: Question[]
  answers: Answer[] | null
  score: number | null
  recommended_level: LearningLevel | null
  completed_at: string | null
  created_at: string
}

export interface SurpriseQuiz {
  id: string
  child_id: string
  subject_id: string | null
  questions: Question[]
  answers: Answer[] | null
  score: number | null
  max_score: number | null
  feedback: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface AIRecommendation {
  id: string
  child_id: string
  type: RecommendationType
  title: string
  description: string | null
  reason: string | null
  priority: number
  is_dismissed: boolean
  created_at: string
}

export interface CurriculumPath {
  id: string
  child_id: string
  subject_id: string
  current_topic: string | null
  completed_topics: string[] | null
  next_topics: string[] | null
  mastery_level: number
  updated_at: string
  created_at: string
}

// AI Request/Response types
export interface GenerateWorksheetRequest {
  subject_id: string
  subject_name: string
  age_group: AgeGroup
  difficulty: Difficulty
  topic?: string
  num_questions?: number
  child_level?: LearningLevel
}

export interface GradeSubmissionRequest {
  worksheet: Worksheet
  answers: Answer[]
  child_age_group: AgeGroup
}

export interface GradeSubmissionResponse {
  score: number
  max_score: number
  graded_answers: Answer[]
  overall_feedback: string
  areas_to_improve: string[]
  strengths: string[]
}

export interface QuizQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correct_answer: string
  points: number
}
