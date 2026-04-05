import "server-only"
import { randomBytes } from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { getPublicAppUrl } from "@/lib/site-url"

const TOKEN_EXPIRY_MINUTES = 60
const FROM_EMAIL = process.env.PASSWORD_RESET_EMAIL_FROM ?? "HomeSchoolar <onboarding@homeschoolars.com>"
const APP_URL = getPublicAppUrl()
const PASSWORD_RESET_PREFIX = "password-reset:"

function resetIdentifier(email: string) {
  return `${PASSWORD_RESET_PREFIX}${email.trim().toLowerCase()}`
}

export async function createAndSendPasswordResetEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  const identifier = resetIdentifier(normalizedEmail)
  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  })

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) {
    console.warn("[Password reset] RESEND_API_KEY not set. Password reset email not sent.")
    return
  }

  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`
  await resend.emails.send({
    from: FROM_EMAIL,
    to: normalizedEmail,
    subject: "Reset your HomeSchoolar password",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Reset your password</h2>
        <p style="color: #4b5563; line-height: 1.6;">We received a request to reset your HomeSchoolar password. Click below to choose a new one.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(to right, #a855f7, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset password</a>
        </p>
        <p style="color: #9ca3af; font-size: 14px;">Or copy this link: <a href="${link}" style="color: #7c3aed;">${link}</a></p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link expires in ${TOKEN_EXPIRY_MINUTES} minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const row = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!row || row.expires < new Date()) {
    return null
  }
  if (!row.identifier.startsWith(PASSWORD_RESET_PREFIX)) {
    return null
  }

  const email = row.identifier.slice(PASSWORD_RESET_PREFIX.length)
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: row.identifier, token: row.token } },
  })
  return email
}
