import { NextResponse } from "next/server"

/** Fast readiness for Cloud Run startup probes — no DB or external calls. */
export const dynamic = "force-dynamic"

export async function GET() {
  const authSecretConfigured = Boolean(
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  )
  return NextResponse.json(
    { ok: true, auth_secret_configured: authSecretConfigured },
    { status: 200 },
  )
}
