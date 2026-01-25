/**
 * Homeschoolars AI Architecture – Lead AI Architect Blueprints
 * Safety-first, one-concept-per-lesson, adaptive, multi-language (EN / Roman Urdu).
 */

import type { AgeGroup } from "@/lib/types"

/** Supported content languages */
export type ContentLanguage = "en" | "roman_urdu"

/** Age brackets for content scaling (map to AgeGroup) */
export const AGE_BRACKETS = {
  "4-6": ["4-5", "6-7"] as const,
  "7-9": ["8-9"] as const,
  "10-13": ["10-11", "12-13"] as const,
} as const

export type AgeBracket = keyof typeof AGE_BRACKETS

/** Error categories for Assessment Engine (Learning Brain) */
export const ERROR_CATEGORIES = {
  conceptual_misunderstanding: "Conceptual misunderstanding",
  procedural_error: "Procedural error",
  attention_lapse: "Attention lapse",
  language_barrier: "Language barrier",
} as const

export type ErrorCategory = keyof typeof ERROR_CATEGORIES

/** Learning Brain – concept mastery thresholds */
export const MASTERY_THRESHOLDS = {
  ADVANCE: 80,
  NEEDS_SUPPORT: 60,
  FOUNDATIONAL: 0,
} as const

/** Difficulty tiers (always available) */
export const DIFFICULTY_TIERS = {
  foundational: "Foundational – step-by-step, maximum support",
  standard: "Standard – balanced pace and challenge",
  advanced: "Advanced – faster, deeper, application-focused",
} as const

export type DifficultyTier = keyof typeof DIFFICULTY_TIERS

/** Content generation input */
export interface LessonContentInput {
  subject: string
  topic: string
  target_age: AgeGroup
  language: ContentLanguage
  concept_id: string
}

/** Video script output (3–5 min optimal) */
export interface VideoScriptOutput {
  title: string
  concept_id: string
  age_bracket: AgeBracket
  vocabulary_level: string
  sections: Array<{
    label: string
    duration_estimate_sec: number
    script: string
    examples: string[]
    interactive_prompts: string[]
  }>
  cultural_context_notes?: string
  total_duration_estimate_sec: number
}

/** Lesson quiz input (20 MCQs) */
export interface LessonQuizInput {
  subject: string
  topic: string
  concept_id: string
  age_group: AgeGroup
  lesson_summary?: string
  recent_topics?: string[]
}

/** Single MCQ (4 options, 1 correct, 3 distractors) */
export interface LessonQuizQuestion {
  id: string
  type: "multiple_choice"
  question: string
  options: [string, string, string, string]
  correct_answer: string
  distractor_rationale?: Record<string, string>
  skill_tested: string
  difficulty: "easy" | "medium" | "hard"
  points: number
}

/** Concept history (long-term memory) */
export interface ConceptHistoryEntry {
  concept_id: string
  subject_id: string
  first_encounter: string
  mastery_achieved: string | null
  retention_score: number
  error_patterns: ErrorCategory[]
  mastery_score: number
}

/** Actionable insight signal */
export interface AssessmentInsight {
  type: "strength" | "weakness" | "improvement" | "recommendation"
  concept_id?: string
  summary: string
  suggested_action?: string
  evidence?: string[]
}

/** Parent dashboard weekly summary template */
export const PARENT_INSIGHT_TEMPLATE = {
  progress_highlights: ["mastered", "improving", "needs_attention"] as const,
  recommendations_max: 5,
  bullet_points_max: 5,
  no_jargon: true,
  positive_framing: true,
} as const

/** Next-topic recommendation decision tree (Phase 3) */
export const NEXT_TOPIC_RULES = {
  quiz_advance_threshold: 80,
  check_prerequisites: true,
  age_appropriateness: true,
  subject_rotation: true,
  review_cycles_for_weak_areas: true,
  output_count: 3,
} as const

/** Multi-language localization (Phase 3) */
export const LOCALIZATION = {
  roman_urdu: {
    examples: "cricket not baseball; Rupees not Dollars; metric; local geography",
    names: "Ali, Sara, Fatima, Hassan",
    phonetic_readability: true,
  },
} as const

/** Cache keys for deterministic, cacheable content */
export function contentCacheKey(input: LessonContentInput): string {
  return `lesson:${input.subject}:${input.topic}:${input.concept_id}:${input.target_age}:${input.language}`
}

export function lessonQuizCacheKey(input: LessonQuizInput): string {
  return `quiz:${input.subject}:${input.topic}:${input.concept_id}:${input.age_group}`
}

/** Map AgeGroup to AgeBracket for content rules */
export function ageGroupToBracket(age: AgeGroup): AgeBracket {
  if (age === "4-5" || age === "6-7") return "4-6"
  if (age === "8-9") return "7-9"
  return "10-13"
}
