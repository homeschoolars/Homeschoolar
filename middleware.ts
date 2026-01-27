import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware to handle common bot/scanner requests gracefully
 * This reduces log noise from WordPress probes and other common scanner patterns
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block common WordPress scanner paths - return 404 immediately without processing
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

  // Check if the path matches any WordPress scanner pattern
  if (wordPressPaths.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, {
      status: 404,
      statusText: "Not Found",
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    })
  }

  // Block other common scanner/bot paths
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

  // Continue with normal request processing
  return NextResponse.next()
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
}
