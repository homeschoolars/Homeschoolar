/**
 * Convert YouTube contentDetails.duration (ISO 8601) to "H:MM:SS" or "M:SS".
 * e.g. PT10M30S → "10:30", PT1H2M3S → "1:02:03"
 */
export function formatYouTubeIsoDuration(iso: string): string | null {
  if (!iso || typeof iso !== "string") return null
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return null

  const h = m[1] ? Number.parseInt(m[1], 10) : 0
  const min = m[2] ? Number.parseInt(m[2], 10) : 0
  const s = m[3] ? Number.parseInt(m[3], 10) : 0

  const pad = (n: number) => String(n).padStart(2, "0")
  if (h > 0) return `${h}:${pad(min)}:${pad(s)}`
  return `${min}:${pad(s)}`
}
