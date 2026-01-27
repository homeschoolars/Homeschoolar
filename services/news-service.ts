import "server-only"
import { generateObject } from "ai"
import { google } from "@/lib/google-ai"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const newsItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
})

const newsBatchSchema = z.object({
  news_items: z.array(newsItemSchema).min(3).max(10),
})

function buildNewsGenerationPrompt(ageBand: "4-7" | "8-13") {
  return `You are a child-safe news editor.

TASK:
Generate short, neutral, age-appropriate news summaries for children aged ${ageBand === "4-7" ? "4-7" : "8-13"}.

RULES:
- No politics
- No violence
- No fear-based language
- Max reading time: 60 seconds per item
- Explain complex topics simply
- Use positive, educational framing
- Categories: science, nature, space, animals, technology, sports, culture, achievements

OUTPUT:
Generate 5-8 news items. Each should have:
- Title (short, engaging)
- Summary (3-5 sentences, age-appropriate)
- Category (one of: science, nature, space, animals, technology, sports, culture, achievements)`
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
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 6) // Expires in 6 hours

  const newsItems = await Promise.all(
    result.object.news_items.map((item) =>
      prisma.childNews.create({
        data: {
          title: item.title,
          summary: item.summary,
          category: item.category,
          ageBand: ageBand === "4-7" ? "AGE_4_7" : "AGE_8_13",
          generatedBy: "gemini",
          expiresAt,
        },
      })
    )
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
