import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
    const { userId, title, message, type = "info", sendEmail = false, emailSubject } = await req.json()

    // Create in-app notification
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message,
        type,
      })
      .select()
      .single()

    if (error) throw error

    // Send email if requested and Resend is configured
    if (sendEmail && resend) {
      // Get user email
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).single()

      // Check user preferences
      const { data: prefs } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).single()

      // Only send if user has email notifications enabled
      const shouldSendEmail = prefs?.email_quiz_results ?? true

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
