import { NextResponse } from "next/server"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth-helpers"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
    const body = z
      .object({
        userId: z.string(),
        title: z.string(),
        message: z.string(),
        type: z.enum(["info", "success", "warning", "achievement"]).optional(),
        sendEmail: z.boolean().optional(),
        emailSubject: z.string().optional(),
      })
      .parse(await req.json())
    const { userId, title, message, type = "info", sendEmail = false, emailSubject } = body
    if (session.user.role !== "admin" && userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    })

    // Send email if requested and Resend is configured
    if (sendEmail && resend) {
      // Get user email
      const profile = await prisma.user.findUnique({ where: { id: userId } })

      // Check user preferences
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId } })

      // Only send if user has email notifications enabled
      const shouldSendEmail = prefs?.emailQuizResults ?? true

      if (profile?.email && shouldSendEmail) {
        await resend.emails.send({
          from: "HomeSchoolar <notifications@homeschoolar.com>",
          to: profile.email,
          subject: emailSubject || title,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0d9488;">${title}</h2>
              <p style="color: #4b5563; line-height: 1.6;">${message}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">
                You're receiving this because you have email notifications enabled.
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications" style="color: #0d9488;">
                  Manage preferences
                </a>
              </p>
            </div>
          `,
        })
      }
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
