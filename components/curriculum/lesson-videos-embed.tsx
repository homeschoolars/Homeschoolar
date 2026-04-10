"use client"

import { useEffect, useState } from "react"
import { Loader2, Play } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import { isValidYouTubeVideoId } from "@/lib/youtube"

export type LessonVideoDto = {
  id: string
  videoId: string
  title: string
  description: string | null
  thumbnail: string | null
  duration: string | null
  lessonId: string
  createdAt: string
}

type Props = {
  lessonId: string
  childId: string
  /** When false, skip fetching (lesson locked or no access). */
  lessonUnlocked: boolean
}

/**
 * Loads lesson-linked YouTube videos from the API (DB only — no YouTube API on the client).
 */
export function LessonVideosEmbed({ lessonId, childId, lessonUnlocked }: Props) {
  const [videos, setVideos] = useState<LessonVideoDto[]>([])
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    setPlayingId(null)
    if (!lessonId || !childId || !lessonUnlocked) {
      setVideos([])
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    void (async () => {
      try {
        const q = new URLSearchParams({ childId })
        const res = await apiFetch(
          `/api/curriculum/lessons/${encodeURIComponent(lessonId)}/videos?${q}`,
          { credentials: "include" },
        )
        const data = (await res.json()) as { videos?: LessonVideoDto[]; error?: string }
        if (!cancelled && res.ok) setVideos(data.videos ?? [])
      } catch {
        if (!cancelled) setVideos([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lessonId, childId, lessonUnlocked])

  if (!lessonUnlocked) return null

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <p className="mt-2 text-sm text-slate-600">Loading lesson videos…</p>
      </section>
    )
  }

  if (videos.length === 0) return null

  return (
    <section className="mt-8 rounded-2xl border border-violet-200 bg-white/95 p-6 shadow-sm">
      <h3 className="font-semibold text-violet-800 mb-4">Lesson videos</h3>
      <ul className="space-y-8">
        {videos.map((v) => {
          const safeId = isValidYouTubeVideoId(v.videoId) ? v.videoId : null
          return (
          <li key={v.id} className="space-y-3">
            <div>
              <p className="font-medium text-slate-900">{v.title}</p>
              {v.duration ? (
                <p className="text-xs text-slate-500 mt-0.5">Duration: {v.duration}</p>
              ) : null}
            </div>
            <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-black aspect-video">
              {playingId === v.id && safeId ? (
                <iframe
                  title={v.title}
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${encodeURIComponent(safeId)}?rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : playingId === v.id && !safeId ? (
                <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-slate-300">
                  Video unavailable (invalid id).
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlayingId(v.id)}
                  className="relative flex h-full w-full items-center justify-center group"
                >
                  {v.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote YouTube CDN thumbnails
                    <img src={v.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-slate-900" />
                  )}
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-violet-700 shadow-lg transition group-hover:scale-105">
                    <Play className="h-8 w-8 ml-1" fill="currentColor" />
                  </span>
                </button>
              )}
            </div>
            {v.description ? (
              <p className="text-sm text-slate-600 max-w-3xl line-clamp-4">{v.description}</p>
            ) : null}
          </li>
          )
        })}
      </ul>
    </section>
  )
}
