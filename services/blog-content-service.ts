import "server-only"
import { generateObject } from "ai"
import { openai } from "@/lib/openai"
import { z } from "zod"
import { enforceSubscriptionAccess } from "@/services/subscription-access"
import { withRetry, isSchemaValidationError, isRateLimitError } from "@/lib/openai-retry"

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

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT PARAMETERS:
- Topic: ${topic}
- Category: ${category}
- Word Count: ${wordCount} words (target, allow ±10% variance)
- Tone: ${tone}
- SEO Keywords: ${seoKeywords.length > 0 ? seoKeywords.join(", ") : "None specified"}

STRICT REQUIREMENTS:
1. Generate blog content in Markdown format
2. Content must be approximately ${wordCount} words (±10% variance acceptable)
3. Include:
   - Title (compelling, SEO-friendly)
   - Subtitle (engaging, supports title)
   - Table of contents (auto-generated from headings)
   - Paragraphs with H2/H3 headings
   - Lists or bullets where applicable
4. Ensure professional and parent-trust tone: ${tone}
5. Include summary paragraph at the end (2-3 sentences)
6. Naturally incorporate SEO keywords: ${seoKeywords.length > 0 ? seoKeywords.join(", ") : "none"}
7. Content must be readable, authoritative, and parent-focused
8. Focus ONLY on topic: ${topic} - do not add unrelated content

STRICT OUTPUT SCHEMA:
{
  "title": string (required, non-empty, compelling and SEO-friendly, 50-70 characters),
  "subtitle": string (required, non-empty, engaging subtitle, 100-150 characters),
  "content_markdown": string (required, non-empty, full blog post in Markdown, approximately ${wordCount} words),
  "seo_meta": {
    "meta_title": string (required, non-empty, SEO meta title, 50-60 characters, includes primary keyword),
    "meta_description": string (required, non-empty, SEO meta description, 150-160 characters, includes keywords),
    "keywords": array (required, must include provided SEO keywords, can add related keywords)
  }
}

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ title: non-empty string, 50-70 characters, includes primary keyword
✓ subtitle: non-empty string, 100-150 characters
✓ content_markdown: non-empty string, approximately ${wordCount} words (±10%), valid Markdown
✓ content_markdown includes: table of contents, headings (H2/H3), paragraphs, lists/bullets, summary paragraph
✓ seo_meta.meta_title: non-empty string, 50-60 characters, includes primary keyword
✓ seo_meta.meta_description: non-empty string, 150-160 characters, includes keywords
✓ seo_meta.keywords: array, includes provided SEO keywords: ${seoKeywords.length > 0 ? seoKeywords.join(", ") : "none"}

ANTI-HALLUCINATION:
- ONLY write about topic: ${topic}
- NEVER add information not relevant to ${topic} and ${category}
- Ensure all facts are accurate and verifiable
- Do not invent statistics or claims without basis
- Stay within parenting, child psychology, learning science, or AI in education scope
- Content must be appropriate for parent audience

Admin can review and publish. Content must be readable, authoritative, and parent-focused. Output must be valid JSON.`
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

  let result
  try {
    result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: blogContentSchema,
          prompt,
        }),
      {
        maxRetries: 3,
        retryDelay: 1000,
      }
    )
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string }
    const hint = err?.status ?? err?.code ?? (err?.message ? String(err.message).slice(0, 200) : "unknown")
    
    console.error(`[Blog Content] OpenAI API error:`, {
      status: err?.status,
      code: err?.code,
      message: err?.message,
      hint,
      topic,
      category,
      isSchemaError: isSchemaValidationError(error),
      isRateLimit: isRateLimitError(error),
    })
    
    if (isSchemaValidationError(error)) {
      throw new Error(
        `Invalid JSON schema for blog content (400 Bad Request). ` +
        `This indicates a schema validation issue. ` +
        `Error: ${hint}. ` +
        `Please check server logs for details.`
      )
    }
    
    if (isRateLimitError(error)) {
      throw new Error(
        `OpenAI rate limit exceeded (429 Too Many Requests). ` +
        `Please wait a moment and try again. ` +
        `If this persists, check your OpenAI quota and billing.`
      )
    }
    
    throw new Error(
      `Failed to generate blog content: ${hint}. ` +
      "Please check your OpenAI API key, quota, billing, and key restrictions."
    )
  }

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
