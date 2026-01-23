import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth-helpers"
import { z } from "zod"

export async function GET() {
  try {
    const session = await requireSession()
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    })
    return NextResponse.json({
      preferences: prefs
        ? {
            email_quiz_results: prefs.emailQuizResults,
            email_progress_updates: prefs.emailProgressUpdates,
            email_ai_recommendations: prefs.emailAiRecommendations,
            email_subscription_alerts: prefs.emailSubscriptionAlerts,
            email_weekly_summary: prefs.emailWeeklySummary,
            inapp_quiz_alerts: prefs.inappQuizAlerts,
            inapp_worksheet_completed: prefs.inappWorksheetCompleted,
            inapp_recommendations: prefs.inappRecommendations,
            inapp_achievements: prefs.inappAchievements,
          }
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preferences"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession()
    const body = z
      .object({
        key: z.enum([
          "email_quiz_results",
          "email_progress_updates",
          "email_ai_recommendations",
          "email_subscription_alerts",
          "email_weekly_summary",
          "inapp_quiz_alerts",
          "inapp_worksheet_completed",
          "inapp_recommendations",
          "inapp_achievements",
        ]),
        value: z.boolean(),
      })
      .parse(await request.json())

    const keyMap: Record<string, string> = {
      email_quiz_results: "emailQuizResults",
      email_progress_updates: "emailProgressUpdates",
      email_ai_recommendations: "emailAiRecommendations",
      email_subscription_alerts: "emailSubscriptionAlerts",
      email_weekly_summary: "emailWeeklySummary",
      inapp_quiz_alerts: "inappQuizAlerts",
      inapp_worksheet_completed: "inappWorksheetCompleted",
      inapp_recommendations: "inappRecommendations",
      inapp_achievements: "inappAchievements",
    }

    const prismaKey = keyMap[body.key]

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: { [prismaKey]: body.value, updatedAt: new Date() },
      create: { userId: session.user.id, [prismaKey]: body.value },
    })

    return NextResponse.json({
      preferences: {
        email_quiz_results: prefs.emailQuizResults,
        email_progress_updates: prefs.emailProgressUpdates,
        email_ai_recommendations: prefs.emailAiRecommendations,
        email_subscription_alerts: prefs.emailSubscriptionAlerts,
        email_weekly_summary: prefs.emailWeeklySummary,
        inapp_quiz_alerts: prefs.inappQuizAlerts,
        inapp_worksheet_completed: prefs.inappWorksheetCompleted,
        inapp_recommendations: prefs.inappRecommendations,
        inapp_achievements: prefs.inappAchievements,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preferences"
    const status = message === "Unauthorized" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
