import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCurrentNews } from "@/services/news-service"
import { z } from "zod"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const getNewsSchema = z.object({
  age_band: z.enum(["4-7", "8-13"]),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only students can access news
    if (session.user.role !== "student") {
      return NextResponse.json({ error: "Only students can access news" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ageBand = searchParams.get("age_band") as "4-7" | "8-13" | null

    if (!ageBand) {
      return NextResponse.json({ error: "age_band is required" }, { status: 400 })
    }

    const news = await getCurrentNews(ageBand)

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
