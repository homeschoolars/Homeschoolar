import { createHmac, timingSafeEqual } from "crypto"

export const STUDENT_SESSION_COOKIE = "hs_student_session"
const STUDENT_SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

type StudentSessionPayload = {
  childId: string
  exp: number
}

function getSessionSecret() {
  const secret = process.env.STUDENT_SESSION_SECRET || process.env.NEXTAUTH_SECRET
  if (secret) return secret
  // Keep student login functional even if env vars are missing.
  // Recommended: set STUDENT_SESSION_SECRET in production.
  return "dev-student-session-secret"
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex")
}

export function createStudentSessionToken(childId: string) {
  const payload: StudentSessionPayload = {
    childId,
    exp: Math.floor(Date.now() / 1000) + STUDENT_SESSION_TTL_SECONDS,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = signValue(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyStudentSessionToken(token: string): StudentSessionPayload | null {
  const [encodedPayload, providedSignature] = token.split(".")
  if (!encodedPayload || !providedSignature) return null

  const expectedSignature = signValue(encodedPayload)
  const provided = Buffer.from(providedSignature, "hex")
  const expected = Buffer.from(expectedSignature, "hex")
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as StudentSessionPayload
    if (!payload.childId || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getStudentSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STUDENT_SESSION_TTL_SECONDS,
  }
}
