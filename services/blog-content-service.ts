import "server-only"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"

const blogContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  content_markdown: z.string(),
  seo_meta: z.object({
    meta_title: z.string(),
    meta_description: z.string(),
    keywords: z.array(z.string()),
  }),
})

function buildBlogContentPrompt({
  topic,
  category,
  wordCount,
  tone,
  seoKeywords,
}: {
  topic: string
  category: string
  wordCount: number
  tone: string
  seoKeywords: string[]
}) {
  return `SYSTEM:
You are an AI content writer specialized in parenting, child psychology, learning science, and AI in education.

INPUT:
{
  "topic": "${topic}",
  "category": "${category}",
  "word_count": ${wordCount},
  "tone": "${tone}",
  "seo_keywords": ${JSON.stringify(seoKeywords)}
}

TASK:
1. Generate blog content in Markdown format.
2. Include:
   - Title
   - Subtitle
   - Table of contents (auto-generated)
   - Paragraphs with headings
   - Lists or bullets where applicable
3. Ensure professional and parent-trust tone.
4. Include summary paragraph at the end.
5. Highlight key phrases for SEO.

OUTPUT FORMAT:
{
  "title": "...",
  "subtitle": "...",
  "content_markdown": "...",
  "seo_meta": {
    "meta_title": "...",
    "meta_description": "...",
    "keywords": ["..."]
  }
}

Notes:

Admin can review and publish.

Content must be readable, authoritative, and parent-focused.`
}

export async function generateBlogContent({
  topic,
  category,
  wordCount = 700,
  tone = "professional, trustworthy, parent-friendly",
  seoKeywords = [],
  userId,
}: {
  topic: string
  category: "Parenting" | "Child Psychology" | "Learning Science" | "AI in Education" | "Product Updates"
  wordCount?: number
  tone?: string
  seoKeywords?: string[]
  userId: string
}) {
  await enforceSubscriptionAccess({ userId, feature: "ai" })

  const prompt = buildBlogContentPrompt({
    topic,
    category,
    wordCount,
    tone,
    seoKeywords,
  })

  const result = await generateObject({
    model: openai("gpt-5-mini"),
    schema: blogContentSchema,
    prompt,
    maxTokens: 4000,
  })

  return {
    title: result.object.title,
    subtitle: result.object.subtitle,
    content: result.object.content_markdown,
    seoMeta: {
      metaTitle: result.object.seo_meta.meta_title,
      metaDescription: result.object.seo_meta.meta_description,
      keywords: result.object.seo_meta.keywords,
    },
  }
}
