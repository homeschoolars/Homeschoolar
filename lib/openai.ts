import "server-only"
import { createOpenAI } from "@ai-sdk/openai"

const PLACEHOLDER = "your-openai-api-key-here"
const raw = process.env.OPENAI_API_KEY
const apiKey = typeof raw === "string" ? raw.trim() : ""

/** Use a valid, non-placeholder API key so OpenAI is actually called. */
export function isOpenAIConfigured(): boolean {
  return apiKey.length > 0 && apiKey !== PLACEHOLDER
}

/** Get the API key status for logging/debugging (only that it's set, never the value). */
export function getOpenAIConfigStatus(): "ok" | "missing" | "placeholder" {
  if (!raw || raw.trim().length === 0) return "missing"
  if (raw.trim() === PLACEHOLDER) return "placeholder"
  return "ok"
}

const providerOptions = isOpenAIConfigured() ? { apiKey } : {}

/** Shared OpenAI provider. Uses OPENAI_API_KEY from env. */
export const openai = createOpenAI(providerOptions)
