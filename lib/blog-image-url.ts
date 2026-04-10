/**
 * Normalize pasted or stored image URLs so they load reliably in the browser.
 */
export function normalizeBlogImageUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith("//")) return `https:${s}`
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith("/")) return s
  // e.g. cdn.example.com/path → https://...
  if (/^[a-z0-9][\w.-]*\.[a-z]{2,}(\/|$)/i.test(s)) {
    return `https://${s}`
  }
  return s
}
