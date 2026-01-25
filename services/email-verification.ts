import "server-only"
import { randomBytes } from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

const TOKEN_EXPIRY_HOURS = 24
const FROM_EMAIL = process.env.VERIFICATION_EMAIL_FROM ?? "HomeSchoolar <onboarding@homeschoolar.com>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/** Create a verification token and send email. Replaces any existing token for this email. */
export async function createAndSendVerificationEmail(email: string): Promise<void> {
  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.verificationToken.deleteMany({ where: { identifier: email } })
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) {
    console.warn("[Email verification] RESEND_API_KEY not set. Verification email not sent.")
    return
  }

  const link = `${APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your HomeSchoolar account",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Verify your email</h2>
        <p style="color: #4b5563; line-height: 1.6;">Thanks for signing up for HomeSchoolar! Click the button below to verify your email and activate your account.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(to right, #0d9488, #14b8a6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify email</a>
        </p>
        <p style="color: #9ca3af; font-size: 14px;">Or copy this link: <a href="${link}" style="color: #0d9488;">${link}</a></p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  })
}

/** Verify token, mark user email as verified, and delete token. Returns email if valid, null otherwise. */
export async function verifyTokenAndMarkVerified(token: string): Promise<string | null> {
  const row = await prisma.verificationToken.findUnique({
    where: { token },
  })
  if (!row || row.expires < new Date()) {
    return null
  }
  const email = row.identifier
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: row.identifier, token: row.token } },
    }),
  ])
  return email
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { emailVerified: true },
  })
  return user?.emailVerified != null
}
