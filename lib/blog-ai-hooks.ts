/**
 * AI-ready hooks for blog (Gemini integration).
 * DO NOT implement AI logic here — interfaces only.
 */

/** Input for AI-assisted blog drafting. */
export interface AIBlogDraftInput {
  topic: string
  category: string
  targetAudience?: "parents" | "educators"
  tone?: "professional" | "friendly" | "informative"
  maxLength?: number
}

/** Output from AI draft generation. */
export interface AIBlogDraftOutput {
  title: string
  excerpt: string
  content: string
  suggestedSlug?: string
  suggestedMetaTitle?: string
  suggestedMetaDescription?: string
}

/** Result of AI readability scoring. */
export interface AIReadabilityResult {
  score: number
  level: "easy" | "moderate" | "challenging"
  suggestions: string[]
}

/** Result of AI summary generation. */
export interface AISummaryResult {
  excerpt: string
  keyPoints: string[]
}

/** AI-generated SEO suggestions. */
export interface AISEOSuggestions {
  metaTitle: string
  metaDescription: string
  suggestedSlug: string
  keywords: string[]
}

/** Hook: AI-assisted draft (future Gemini). */
export type UseAIBlogDraft = (input: AIBlogDraftInput) => Promise<AIBlogDraftOutput | null>

/** Hook: AI readability scoring. */
export type UseAIReadability = (content: string) => Promise<AIReadabilityResult | null>

/** Hook: AI summary generation. */
export type UseAISummary = (content: string) => Promise<AISummaryResult | null>

/** Hook: AI SEO suggestions. */
export type UseAISEOSuggestions = (title: string, content: string) => Promise<AISEOSuggestions | null>
