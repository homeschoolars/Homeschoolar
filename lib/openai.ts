import "server-only"
import { createOpenAI } from "@ai-sdk/openai"
import { getOpenAIApiKey, isOpenAIConfigured } from "./openai-config"

export { getOpenAIConfigStatus, isOpenAIConfigured } from "./openai-config"

const providerOptions = isOpenAIConfigured() ? { apiKey: getOpenAIApiKey() } : {}

/** Shared OpenAI provider. Uses OPENAI_API_KEY from env. */
export const openai = createOpenAI(providerOptions)
