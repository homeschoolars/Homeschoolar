import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

/**
 * Next.js Proxy: bot/scanner blocking + session-based redirects (onboarding, role).
 * API and static assets are excluded via matcher.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const wordPressPaths = [
    /^\/wp-admin/,
    /^\/wp-includes/,
    /^\/wp-content/,
    /^\/wordpress/,
    /^\/xmlrpc\.php/,
    /^\/wp-login\.php/,
    /^\/wp-cron\.php/,
    /^\/wp-load\.php/,
    /^\/wp-config\.php/,
    /^\/wp-settings\.php/,
    /^\/wp-signup\.php/,
    /^\/wp-trackback\.php/,
    /^\/wp-mail\.php/,
    /^\/wp-comments-post\.php/,
    /^\/wp-links-opml\.php/,
    /^\/wp-atom\.php/,
    /^\/wp-rdf\.php/,
    /^\/wp-rss\.php/,
    /^\/wp-rss2\.php/,
    /^\/wp-feed\.php/,
    /^\/readme\.html/,
    /^\/license\.txt/,
    /^\/wp-json\/wp\/v2\/users/,
  ]

  if (wordPressPaths.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, {
      status: 404,
      statusText: "Not Found",
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    })
  }

  const scannerPaths = [
    /^\/\.env/,
    /^\/\.git/,
    /^\/\.svn/,
    /^\/\.htaccess/,
    /^\/\.htpasswd/,
    /^\/phpmyadmin/,
    /^\/adminer\.php/,
    /^\/administrator/,
    /^\/cpanel/,
    /^\/phpinfo\.php/,
    /^\/test\.php/,
    /^\/shell\.php/,
    /^\/config\.php/,
    /^\/database\.php/,
    /^\/backup\.sql/,
    /^\/\.well-known\/acme-challenge/,
  ]

  if (scannerPaths.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, {
      status: 404,
      statusText: "Not Found",
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    })
  }

  const userAgent = request.headers.get("user-agent")?.toLowerCase() || ""
  const botPatterns = [
    /^curl\//i,
    /^wget\//i,
    /^python-requests\//i,
    /^go-http-client\//i,
    /^java\//i,
    /^scanner/i,
    /^bot/i,
    /^crawler/i,
    /^spider/i,
  ]

  if (!pathname.startsWith("/api/") && botPatterns.some((pattern) => pattern.test(userAgent))) {
    const allowedBots = ["googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot"]
    const isAllowedBot = allowedBots.some((bot) => userAgent.includes(bot))

    if (!isAllowedBot) {
      return new NextResponse(null, {
        status: 403,
        statusText: "Forbidden",
        headers: {
          "X-Robots-Tag": "noindex, nofollow",
        },
      })
    }
  }

  if (
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
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
}
