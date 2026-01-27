import { headers } from "next/headers"

/** Base URL for server-side fetch to our own API (blog, etc.). */
export async function getBlogApiBase(): Promise<string> {
  const h = await headers()
  const host = h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
