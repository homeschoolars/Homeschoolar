import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { handlers } from "@/auth"

export const dynamic = "force-dynamic"

const hasAuthSecret = () =>
  Boolean(process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim())

/**
 * Auth.js returns HTML "Internal Server Error" when the secret is missing, which breaks
 * the client (`res.json()` throws). Short-circuit with JSON so SessionProvider and sign-in work.
 */
function guard(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    if (process.env.NODE_ENV === "production" && !hasAuthSecret()) {
      console.error("[auth] Missing AUTH_SECRET or NEXTAUTH_SECRET in production")
      return NextResponse.json(
        {
          error: "Configuration",
          message:
            "Set AUTH_SECRET (or NEXTAUTH_SECRET) on the Cloud Run service. Generate one with: openssl rand -base64 32",
        },
        { status: 503 },
      )
    }
    return handler(req)
  }
}

export const GET = guard(handlers.GET)
export const POST = guard(handlers.POST)
