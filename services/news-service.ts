import "server-only"
import { generateObject } from "ai"
import { google } from "@/lib/google-ai"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const newsItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  age_band: z.enum(["4-7", "8-13"]),
  generated_at: z.string(),
  expires_at: z.string(),
})

const newsBatchSchema = z.array(newsItemSchema).min(3).max(5)

function buildNewsGenerationPrompt(ageBand: "4-7" | "8-13") {
  const topics = ["science", "technology", "education", "environment", "culture"]
  
  return `SYSTEM:
You are a child-safe news editor for children aged 4-13. Your task is to generate short, neutral, and age-appropriate news summaries.

INPUT:
{
  "age_band": "${ageBand}",
  "topics": ${JSON.stringify(topics)}
}

TASK:
1. Generate 3-5 news items.
2. Each news item must include:
   - Title
   - 3-5 sentence summary
   - Category
   - Age-appropriate reading level
3. Avoid politics, violence, fear, or adult content.
4. Use positive, engaging, and explanatory tone.
5. For age 4-7, simplify language and use very short sentences.
6. For age 8-13, slightly longer sentences, but keep simple structure.
7. News panel must refresh every 6 hours.

OUTPUT FORMAT (JSON):
[
  {
    "title": "...",
    "summary": "...",
    "category": "...",
    "age_band": "${ageBand}",
    "generated_at": "YYYY-MM-DDTHH:mm:ssZ",
    "expires_at": "YYYY-MM-DDTHH:mm:ssZ"
  },
  {...}
]

Notes:

Output strict JSON.

Always generate expires_at 6 hours after generated_at.

Use topic variety to keep daily feed interesting.`
}

export async function generateChildNews(ageBand: "4-7" | "8-13") {
  const prompt = buildNewsGenerationPrompt(ageBand)

  const result = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: newsBatchSchema,
    prompt,
    maxOutputTokens: 2000,
  })

  // Delete expired news
  await prisma.childNews.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  // Create new news items
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6 hours from now

  const newsItems = await Promise.all(
    result.object.map((item) => {
      // Parse dates from AI response or use current time
      const generatedAt = item.generated_at ? new Date(item.generated_at) : now
      const itemExpiresAt = item.expires_at ? new Date(item.expires_at) : expiresAt

      return prisma.childNews.create({
        data: {
          title: item.title,
          summary: item.summary,
          category: item.category,
          ageBand: ageBand === "4-7" ? "AGE_4_7" : "AGE_8_13",
          generatedBy: "gemini",
          generatedAt,
          expiresAt: itemExpiresAt,
        },
      })
    })
  )

  return newsItems
}

export async function getCurrentNews(ageBand: "4-7" | "8-13") {
  const now = new Date()

  return prisma.childNews.findMany({
    where: {
      ageBand: ageBand === "4-7" ? "AGE_4_7" : "AGE_8_13",
      expiresAt: { gt: now },
    },
    orderBy: { generatedAt: "desc" },
    take: 10,
  })
}

export async function regenerateNews(ageBand: "4-7" | "8-13") {
  // Delete all current news for this age band
  await prisma.childNews.deleteMany({
    where: {
      ageBand: ageBand === "4-7" ? "AGE_4_7" : "AGE_8_13",
    },
  })

  // Generate new news
  return generateChildNews(ageBand)
}
