import { NextResponse } from "next/server"

/**
 * Next.js matches this static segment before `auth/[...nextauth]`.
 * Auth.js default `/api/auth/error` can 500 in production (e.g. missing AUTH_SECRET
 * while rendering the built-in error response). Redirect without loading NextAuth.
 */
export function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("error") ?? "Configuration"
  const login = new URL("/login", url.origin)
  login.searchParams.set("error", code)
  return NextResponse.redirect(login)
}
