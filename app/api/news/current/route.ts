import { NextResponse } from "next/server"
import { getCurrentNews } from "@/services/news-service"
import { z } from "zod"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const getNewsSchema = z.object({
  age_band: z.enum(["4-7", "8-13"]),
})

/**
 * Curated, non-personal summaries by age band. Open read avoids 401s when student
 * cookie/session edge cases occur; content is the same for all users in a band.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = getNewsSchema.safeParse({
      age_band: searchParams.get("age_band"),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "age_band is required and must be 4-7 or 8-13" },
        { status: 400 },
      )
    }

    const news = await getCurrentNews(parsed.data.age_band)

    return NextResponse.json({
      news: news.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        category: n.category,
        age_band: n.ageBand,
        generated_at: n.generatedAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get news"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
