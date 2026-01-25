import "server-only"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const PLACEHOLDER = "your-google-generative-ai-api-key-here"
const raw = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const apiKey = typeof raw === "string" ? raw.trim() : ""

/** Use a valid, non-placeholder API key so Gemini is actually called. */
export function isGeminiConfigured(): boolean {
  return apiKey.length > 0 && apiKey !== PLACEHOLDER
}

/** Get the API key for logging/debugging (only that it's set, never the value). */
export function getGeminiConfigStatus(): "ok" | "missing" | "placeholder" {
  if (!raw || raw.trim().length === 0) return "missing"
  if (raw.trim() === PLACEHOLDER) return "placeholder"
  return "ok"
}

const providerOptions = isGeminiConfigured() ? { apiKey } : {}

/** Shared Google AI provider. Uses GOOGLE_GENERATIVE_AI_API_KEY from env. */
export const google = createGoogleGenerativeAI(providerOptions)
