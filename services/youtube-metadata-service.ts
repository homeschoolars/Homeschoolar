import "server-only"
import {
  extractYouTubeVideoId,
  formatYouTubeIsoDuration,
  isValidYouTubeVideoId,
} from "@/lib/youtube"

const DESCRIPTION_MAX_LEN = 12_000

/** In-memory metadata cache to cut duplicate quota use (preview → save, repeated pastes). */
const METADATA_CACHE = new Map<string, { expiresAt: number; data: YouTubeVideoMetadata }>()
const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 200

export type YouTubeVideoMetadata = {
  videoId: string
  title: string
  description: string | null
  thumbnail: string | null
  /** Display duration e.g. "10:30" */
  duration: string | null
  embeddable: boolean
}

export class YouTubeMetadataError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_URL"
      | "NOT_FOUND"
      | "NOT_EMBEDDABLE"
      | "API_ERROR"
      | "QUOTA_EXCEEDED"
      | "NO_API_KEY",
  ) {
    super(message)
    this.name = "YouTubeMetadataError"
  }
}

type VideosListResponse = {
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> }
  items?: Array<{
    id: string
    snippet?: {
      title?: string
      description?: string
      thumbnails?: { high?: { url?: string }; maxres?: { url?: string }; standard?: { url?: string } }
    }
    contentDetails?: { duration?: string }
    status?: { embeddable?: boolean }
  }>
}

function pruneMetadataCache() {
  const now = Date.now()
  for (const [k, v] of METADATA_CACHE) {
    if (v.expiresAt <= now) METADATA_CACHE.delete(k)
  }
  while (METADATA_CACHE.size > CACHE_MAX_ENTRIES) {
    const oldest = METADATA_CACHE.keys().next().value
    if (oldest === undefined) break
    METADATA_CACHE.delete(oldest)
  }
}

function getCachedMetadata(videoId: string): YouTubeVideoMetadata | null {
  pruneMetadataCache()
  const hit = METADATA_CACHE.get(videoId)
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit) METADATA_CACHE.delete(videoId)
    return null
  }
  return hit.data
}

function setCachedMetadata(videoId: string, data: YouTubeVideoMetadata) {
  pruneMetadataCache()
  METADATA_CACHE.set(videoId, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Only persist thumbnail URLs from known YouTube / Google image hosts (mitigates stored XSS via img src).
 */
export function sanitizeYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null
  try {
    const u = new URL(url.trim())
    if (u.protocol !== "https:") return null
    const h = u.hostname.toLowerCase()
    if (h === "i.ytimg.com" || h.endsWith(".ytimg.com")) return u.toString()
    if (h === "img.youtube.com") return u.toString()
    if (h.endsWith(".googleusercontent.com") || h.endsWith(".ggpht.com")) return u.toString()
    return null
  } catch {
    return null
  }
}

function truncateDescription(text: string | null | undefined): string | null {
  if (text == null) return null
  const t = text.trim()
  if (!t) return null
  return t.length <= DESCRIPTION_MAX_LEN ? t : `${t.slice(0, DESCRIPTION_MAX_LEN)}…`
}

/**
 * Fetch public metadata for a single video via YouTube Data API v3 (server-side only).
 * Uses a short TTL in-memory cache keyed by video id to spare quota on repeat requests.
 */
export async function fetchYouTubeVideoMetadata(
  youtubeUrlOrId: string,
  apiKey: string | undefined,
): Promise<YouTubeVideoMetadata> {
  if (!apiKey?.trim()) {
    throw new YouTubeMetadataError("YOUTUBE_API_KEY is not configured on the server.", "NO_API_KEY")
  }

  const videoId = extractYouTubeVideoId(youtubeUrlOrId)
  if (!videoId) {
    throw new YouTubeMetadataError("Invalid or unsupported YouTube URL.", "INVALID_URL")
  }

  const cached = getCachedMetadata(videoId)
  if (cached) return cached

  const params = new URLSearchParams({
    part: "snippet,contentDetails,status",
    id: videoId,
    key: apiKey.trim(),
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  const data = (await res.json()) as VideosListResponse

  if (!res.ok) {
    const msg = data.error?.message ?? res.statusText
    if (res.status === 403) {
      const reason = data.error?.errors?.[0]?.reason
      if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
        throw new YouTubeMetadataError("YouTube API quota exceeded. Try again later.", "QUOTA_EXCEEDED")
      }
    }
    throw new YouTubeMetadataError(`YouTube API error: ${msg}`, "API_ERROR")
  }

  if (data.error) {
    throw new YouTubeMetadataError(data.error.message ?? "YouTube API error", "API_ERROR")
  }

  const item = data.items?.[0]
  if (!item) {
    throw new YouTubeMetadataError("Video not found or is private.", "NOT_FOUND")
  }

  if (!isValidYouTubeVideoId(item.id)) {
    throw new YouTubeMetadataError("Unexpected response from YouTube API.", "API_ERROR")
  }

  const embeddable = item.status?.embeddable !== false
  if (!embeddable) {
    throw new YouTubeMetadataError("This video is not embeddable (owner disabled embedding).", "NOT_EMBEDDABLE")
  }

  const sn = item.snippet
  const thumbs = sn?.thumbnails
  const rawThumb =
    thumbs?.maxres?.url ?? thumbs?.high?.url ?? thumbs?.standard?.url ?? null
  const thumbnail = sanitizeYouTubeThumbnailUrl(rawThumb)

  const durationIso = item.contentDetails?.duration ?? ""
  const duration = formatYouTubeIsoDuration(durationIso) ?? (durationIso || null)

  const meta: YouTubeVideoMetadata = {
    videoId: item.id,
    title: sn?.title?.trim() || "Untitled video",
    description: truncateDescription(sn?.description),
    thumbnail,
    duration,
    embeddable: true,
  }

  setCachedMetadata(videoId, meta)
  return meta
}
