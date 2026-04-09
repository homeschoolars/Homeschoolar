import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  if (!secret) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret })
  if (!token) {
    return NextResponse.next()
  }

  const role = token.role as string | undefined
  const onboardingComplete = token.onboardingComplete as boolean | null | undefined

  if (role === "admin") {
    return NextResponse.next()
  }

  if (role === "student" && pathname.startsWith("/parent/children/")) {
    return NextResponse.redirect(new URL("/student", request.url))
  }

  if (role === "parent" && onboardingComplete === false) {
    if (!pathname.startsWith("/register") && pathname !== "/login" && pathname !== "/signup") {
      return NextResponse.redirect(new URL("/register", request.url))
    }
  }

  if (pathname.startsWith("/register") && role === "parent" && onboardingComplete !== false) {
    return NextResponse.redirect(new URL("/parent/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
