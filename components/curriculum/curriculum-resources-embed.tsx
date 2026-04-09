"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type Resource = {
  id: string
  age: number
  subject: string
  topic: string
  resourceType: string
  title: string
  url: string
}

function youtubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null
    if (u.searchParams.get("v")) return u.searchParams.get("v")
    const m = u.pathname.match(/\/embed\/([^/]+)/)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

type Props = {
  childId: string
  age: number
  subjectName: string
  topicTitle: string
}

export function CurriculumResourcesEmbed({ childId, age, subjectName, topicTitle }: Props) {
  const [items, setItems] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const q = new URLSearchParams({
          childId,
          age: String(age),
          subject: subjectName,
          topic: topicTitle,
        })
        const res = await apiFetch(`/api/curriculum/resources?${q}`, { credentials: "include" })
        const data = (await res.json()) as { resources?: Resource[] }
        if (!cancelled && res.ok) setItems(data.resources ?? [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [childId, age, subjectName, topicTitle])

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <p className="mt-2 text-sm text-slate-600">Loading extra resources…</p>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mt-8 rounded-2xl border border-violet-200 bg-white/90 p-6 shadow-sm">
      <h3 className="font-semibold text-violet-800 mb-4">Extra resources for this topic</h3>
      <ul className="space-y-6">
        {items.map((r) => (
          <li key={r.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
            <p className="font-medium text-slate-900">{r.title}</p>
            <p className="text-xs text-slate-500 capitalize mb-2">{r.resourceType.replace(/_/g, " ")}</p>
            {r.resourceType === "youtube" && youtubeEmbedId(r.url) ? (
              <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-xl bg-black">
                <iframe
                  title={r.title}
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${youtubeEmbedId(r.url)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}
            {r.resourceType === "pdf" ? (
              <div className="space-y-2">
                <iframe title={r.title} src={r.url} className="h-96 w-full max-w-3xl rounded-lg border" />
                <a
                  href={r.url}
                  download
                  className="text-sm font-medium text-violet-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download PDF
                </a>
              </div>
            ) : null}
            {r.resourceType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.url} alt={r.title} className="max-h-96 rounded-lg border object-contain" />
            ) : null}
            {r.resourceType === "video" ? (
              <video src={r.url} controls className="max-h-96 w-full max-w-3xl rounded-lg border bg-black" />
            ) : null}
            {r.resourceType === "audio" ? (
              <audio src={r.url} controls className="w-full max-w-md" />
            ) : null}
            {(r.resourceType === "ppt" || r.resourceType === "word") && (
              <a
                href={r.url}
                className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                Download file
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
