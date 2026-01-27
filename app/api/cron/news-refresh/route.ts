import { NextResponse } from "next/server"
import { generateChildNews } from "@/services/news-service"

// This endpoint should be called by a cron job every 6 hours
// You can use services like Vercel Cron, GitHub Actions, or external cron services
export async function GET(request: Request) {
  try {
    // Verify cron secret if needed
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate news for both age bands
    const [news4_7, news8_13] = await Promise.all([
      generateChildNews("4-7"),
      generateChildNews("8-13"),
    ])

    return NextResponse.json({
      success: true,
      message: "News refreshed successfully",
      news_4_7_count: news4_7.length,
      news_8_13_count: news8_13.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh news"
    console.error("News refresh error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
