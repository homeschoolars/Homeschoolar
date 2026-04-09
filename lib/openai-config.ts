import "server-only"

const PLACEHOLDER = "your-openai-api-key-here"
const raw = process.env.OPENAI_API_KEY
const apiKey = typeof raw === "string" ? raw.trim() : ""

/** Use a valid, non-placeholder API key so OpenAI is actually called. */
export function isOpenAIConfigured(): boolean {
  return apiKey.length > 0 && apiKey !== PLACEHOLDER
}

/** Whether the key is set (for logging/debugging; never exposes the value). */
export function getOpenAIConfigStatus(): "ok" | "missing" | "placeholder" {
  if (!raw || raw.trim().length === 0) return "missing"
  if (raw.trim() === PLACEHOLDER) return "placeholder"
  return "ok"
}

/** Resolved key for the SDK when configured (empty string when not). */
export function getOpenAIApiKey(): string {
  return apiKey
}
