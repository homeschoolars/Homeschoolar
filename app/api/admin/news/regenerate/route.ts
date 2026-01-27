import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { regenerateNews } from "@/services/news-service"
import { z } from "zod"

const regenerateNewsSchema = z.object({
  age_band: z.enum(["4-7", "8-13"]).optional(),
})

export async function POST(request: Request) {
  try {
    await requireRole(["admin"])

    const body = regenerateNewsSchema.parse(await request.json())

    // If age_band not specified, regenerate for both
    if (!body.age_band) {
      const [news4_7, news8_13] = await Promise.all([
        regenerateNews("4-7"),
        regenerateNews("8-13"),
      ])

      return NextResponse.json({
        message: "News regenerated for all age bands",
        news_4_7: news4_7.length,
        news_8_13: news8_13.length,
      })
    }

    const news = await regenerateNews(body.age_band)

    return NextResponse.json({
      message: `News regenerated for age band ${body.age_band}`,
      news_count: news.length,
      news: news.map((n) => ({
        id: n.id,
        title: n.title,
        category: n.category,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate news"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
