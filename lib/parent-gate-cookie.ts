import { createHmac, timingSafeEqual } from "crypto"
import type { NextResponse } from "next/server"

const COOKIE = "hs_parent_gate"
const TTL_SECONDS = 60 * 60 * 2

function secret() {
  return (
    process.env.STUDENT_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-parent-gate-secret"
  )
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex")
}

function b64e(s: string) {
  return Buffer.from(s, "utf8").toString("base64url")
}

function b64d(s: string) {
  return Buffer.from(s, "base64url").toString("utf8")
}

export function createParentGateToken(childId: string) {
  const payload = { childId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }
  const enc = b64e(JSON.stringify(payload))
  return `${enc}.${sign(enc)}`
}

export function verifyParentGateToken(token: string | undefined): { childId: string } | null {
  if (!token) return null
  const [enc, sig] = token.split(".")
  if (!enc || !sig) return null
  const expected = sign(enc)
  const a = Buffer.from(sig, "hex")
  const b = Buffer.from(expected, "hex")
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(b64d(enc)) as { childId?: string; exp?: number }
    if (!p.childId || !p.exp) return null
    if (p.exp < Math.floor(Date.now() / 1000)) return null
    return { childId: p.childId }
  } catch {
    return null
  }
}

export function readParentGateCookie(cookieHeader: string | null): { childId: string } | null {
  if (!cookieHeader) return null
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${COOKIE}=`))
  if (!match) return null
  const value = match.split("=").slice(1).join("=").trim()
  return verifyParentGateToken(decodeURIComponent(value))
}

export function setParentGateCookie(res: NextResponse, childId: string) {
  res.cookies.set(COOKIE, createParentGateToken(childId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  })
}

export const PARENT_GATE_COOKIE_NAME = COOKIE
