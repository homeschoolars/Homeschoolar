import "server-only"

/**
 * Public site origin (no trailing slash).
 * Uses AUTH_URL, then NEXT_PUBLIC_APP_URL, then environment-appropriate defaults.
 */
export function getPublicAppUrl(): string {
  const raw =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://homeschoolars.com")
  return raw.replace(/\/$/, "")
}
