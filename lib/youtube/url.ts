/**
 * Parse YouTube watch/share/embed URLs and validate canonical 11-character video ids.
 */

export const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

export function isValidYouTubeVideoId(id: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(id)
}

/**
 * Find the first valid video id anywhere in the string (handles double-pasted URLs,
 * trailing junk, or missing https://).
 */
function extractVideoIdLooseScan(s: string): string | null {
  // Fixed {11} captures exactly the id; works when two URLs are pasted back-to-back (e.g. …jpQhttps…).
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m?.[1] && isValidYouTubeVideoId(m[1])) return m[1]
  }
  return null
}

/**
 * Extract YouTube video id from watch, youtu.be, embed, shorts, or legacy /v/ URLs.
 * Returns null if the string is not a recognizable YouTube URL or id.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  if (isValidYouTubeVideoId(raw)) return raw

  const loose = extractVideoIdLooseScan(raw)
  if (loose) return loose

  try {
    let url = new URL(raw)
    if (!url.protocol || url.protocol === "javascript:") {
      url = new URL(`https://${raw.replace(/^\/\//, "")}`)
    }

    const host = url.hostname.replace(/^www\./, "").toLowerCase()

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id && isValidYouTubeVideoId(id) ? id : null
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v")
      if (v && isValidYouTubeVideoId(v)) return v

      const embed = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
      if (embed?.[1] && isValidYouTubeVideoId(embed[1])) return embed[1]

      const shorts = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (shorts?.[1] && isValidYouTubeVideoId(shorts[1])) return shorts[1]

      const vPath = url.pathname.match(/\/v\/([a-zA-Z0-9_-]{11})/)
      if (vPath?.[1] && isValidYouTubeVideoId(vPath[1])) return vPath[1]
    }

    return null
  } catch {
    return null
  }
}
