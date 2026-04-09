import { generateText } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"

const TIER_LABELS: Record<number, string> = {
  1: "Genius",
  2: "Brilliant",
  3: "Intermediate",
  4: "Mediocre",
  5: "Slow_Learner",
}

function tierOrDefault(tier: number | null | undefined): number {
  if (typeof tier === "number" && tier >= 1 && tier <= 5) return tier
  return 3
}

export async function generateWorksheetWithHolisticTier(input: {
  age: number
  topic: string
  subject: string
  difficultyTier: number | null | undefined
}) {
  if (!isOpenAIConfigured()) throw new Error("OpenAI is not configured")

  const level = tierOrDefault(input.difficultyTier)
  const label = TIER_LABELS[level]

  const prompt = `Generate a worksheet for a ${input.age} year old student at difficulty level ${level} (${label} — do not mention this label anywhere in the output).
Topic: ${input.topic}. Subject: ${input.subject}.
The worksheet must be solvable on-screen and downloadable as PDF.
Questions must match the cognitive level of this difficulty tier.

Return ONLY valid JSON with shape:
{
  "title": "string",
  "instructions": "string",
  "activities": [
    { "type": "mcq", "question": "string", "options": ["string"], "correctAnswer": "string" }
    or { "type": "short_answer", "question": "string", "hint": "string|null" }
  ]
}`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.6,
    maxOutputTokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const clean = text.replace(/```json|```/g, "").trim()
  return JSON.parse(clean) as {
    title: string
    instructions: string
    activities: unknown[]
  }
}

export async function generateTopicActivity(input: { age: number; topic: string; subject: string }) {
  if (!isOpenAIConfigured()) throw new Error("OpenAI is not configured")

  let band = "7-9"
  if (input.age <= 6) band = "4-6"
  else if (input.age >= 10) band = "10-13"

  const typeHints =
    band === "4-6"
      ? "Draw and colour, Show and tell, Match and paste"
      : band === "7-9"
        ? "Simple experiments, Creative projects, Role play"
        : "Research tasks, Debate prompts, Design challenges"

  const prompt = `Create ONE age-appropriate homeschool activity for age ${input.age}, subject "${input.subject}", topic "${input.topic}".
Preferred activity families for this age band: ${typeHints}.

Return ONLY valid JSON:
{ "title": "string", "summary": "string", "steps": ["string"], "materials": ["string"], "safetyNote": "string|null" }`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.7,
    maxOutputTokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const clean = text.replace(/```json|```/g, "").trim()
  return JSON.parse(clean) as {
    title: string
    summary: string
    steps: string[]
    materials: string[]
    safetyNote: string | null
  }
}
