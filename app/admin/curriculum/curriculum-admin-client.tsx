"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"

const AGES = Array.from({ length: 10 }, (_, i) => i + 4)
const TYPES = ["youtube", "pdf", "ppt", "image", "video", "audio", "word"] as const

type VideoPreviewPayload = {
  videoId: string
  title: string
  description: string | null
  thumbnail: string | null
  duration: string | null
  lessonTitle?: string
}

export default function CurriculumAdminClient() {
  const [age, setAge] = useState("8")
  const [subject, setSubject] = useState("")
  const [topic, setTopic] = useState("")
  const [resourceType, setResourceType] = useState<(typeof TYPES)[number]>("youtube")
  const [title, setTitle] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /** Attach validated YouTube metadata to a curriculum lesson (UUID). */
  const [lessonUuid, setLessonUuid] = useState("")
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState("")
  const [videoPreview, setVideoPreview] = useState<VideoPreviewPayload | null>(null)
  const [videoAttachStatus, setVideoAttachStatus] = useState<string | null>(null)
  const [videoPreviewLoading, setVideoPreviewLoading] = useState(false)
  const [videoSaveLoading, setVideoSaveLoading] = useState(false)

  const fetchVideoPreview = useCallback(
    async (url: string) => {
      const trimmedLesson = lessonUuid.trim()
      const trimmedUrl = url.trim()
      setVideoAttachStatus(null)
      if (!trimmedLesson) {
        setVideoAttachStatus("Enter the curriculum lesson UUID first.")
        return
      }
      if (!trimmedUrl) {
        setVideoAttachStatus("Paste or enter a YouTube URL.")
        return
      }
      setVideoPreviewLoading(true)
      setVideoPreview(null)
      try {
        const res = await apiFetch("/api/admin/curriculum/lesson-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            youtubeUrl: trimmedUrl,
            lessonId: trimmedLesson,
            dryRun: true,
          }),
        })
        const data = (await res.json()) as {
          preview?: VideoPreviewPayload
          error?: string
          code?: string
        }
        if (!res.ok) {
          setVideoAttachStatus(data.error ?? "Could not load video preview.")
          return
        }
        if (data.preview) {
          setVideoPreview(data.preview)
        }
      } catch {
        setVideoAttachStatus("Network error while previewing.")
      } finally {
        setVideoPreviewLoading(false)
      }
    },
    [lessonUuid],
  )

  const saveLessonVideo = async () => {
    const trimmedLesson = lessonUuid.trim()
    const trimmedUrl = lessonYoutubeUrl.trim()
    setVideoAttachStatus(null)
    if (!trimmedLesson || !trimmedUrl) {
      setVideoAttachStatus("Lesson UUID and YouTube URL are required.")
      return
    }
    setVideoSaveLoading(true)
    try {
      const res = await apiFetch("/api/admin/curriculum/lesson-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          youtubeUrl: trimmedUrl,
          lessonId: trimmedLesson,
        }),
      })
      const data = (await res.json()) as { video?: { id: string }; error?: string; code?: string }
      if (res.status === 409) {
        setVideoAttachStatus(data.error ?? "This video is already linked to this lesson.")
        return
      }
      if (!res.ok) {
        setVideoAttachStatus(data.error ?? "Could not save video.")
        return
      }
      setVideoAttachStatus(`Saved to lesson. Video row: ${data.video?.id ?? "ok"}`)
    } catch {
      setVideoAttachStatus("Network error while saving.")
    } finally {
      setVideoSaveLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append("age", age)
      form.append("subject", subject.trim())
      form.append("topic", topic.trim())
      form.append("resourceType", resourceType)
      form.append("title", title.trim())
      if (resourceType === "youtube") {
        form.append("youtubeUrl", youtubeUrl.trim())
      } else if (file) {
        form.append("file", file)
      }
      const res = await apiFetch("/api/admin/curriculum/resources", {
        method: "POST",
        body: form,
        credentials: "include",
      })
      const data = (await res.json()) as { error?: string; resource?: { url: string } }
      if (!res.ok) {
        setStatus(data.error ?? "Upload failed")
        return
      }
      setStatus(`Saved. URL: ${data.resource?.url ?? "ok"}`)
      setFile(null)
      setYoutubeUrl("")
    } catch {
      setStatus("Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 md:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Curriculum resources</h1>
          <p className="text-sm text-slate-600">Tag uploads by age, subject, and topic.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">← Admin</Link>
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Age (years)</Label>
            <Select value={age} onValueChange={setAge}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGES.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resource type</Label>
            <Select value={resourceType} onValueChange={(v) => setResourceType(v as (typeof TYPES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Subject (label)</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Science" required />
        </div>
        <div className="space-y-2">
          <Label>Topic (match lesson title)</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Plants and sunlight" required />
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        {resourceType === "youtube" ? (
          <div className="space-y-2">
            <Label>YouTube URL (embed only — no downloads)</Label>
            <Input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
        )}
        {status && <p className="text-sm text-slate-700">{status}</p>}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : "Save resource"}
        </Button>
      </form>

      <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Lesson YouTube video</h2>
          <p className="mt-1 text-sm text-slate-600">
            Paste a link to fetch title, thumbnail, and duration via the YouTube Data API (server-side{" "}
            <code className="rounded bg-white/80 px-1 text-xs">YOUTUBE_API_KEY</code>). Students see the embed only when
            the lesson is unlocked for them; playback uses stored metadata only.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lesson-uuid">Curriculum lesson ID (UUID)</Label>
          <Input
            id="lesson-uuid"
            value={lessonUuid}
            onChange={(e) => {
              setLessonUuid(e.target.value)
              setVideoPreview(null)
            }}
            placeholder="e.g. from curriculum_lessons.id"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lesson-youtube">YouTube URL</Label>
          <Input
            id="lesson-youtube"
            type="url"
            value={lessonYoutubeUrl}
            onChange={(e) => setLessonYoutubeUrl(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text/plain").trim()
              if (pasted) {
                setLessonYoutubeUrl(pasted)
                queueMicrotask(() => void fetchVideoPreview(pasted))
              }
            }}
            placeholder="https://www.youtube.com/watch?v=… or youtu.be/…"
          />
          <p className="text-xs text-slate-500">Preview runs automatically when you paste. You can also type a URL and use Preview.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={videoPreviewLoading}
            onClick={() => void fetchVideoPreview(lessonYoutubeUrl)}
          >
            {videoPreviewLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              "Preview"
            )}
          </Button>
          <Button type="button" disabled={videoSaveLoading || !videoPreview} onClick={() => void saveLessonVideo()}>
            {videoSaveLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save to lesson"
            )}
          </Button>
        </div>
        {videoAttachStatus ? (
          <p className={`text-sm ${videoAttachStatus.startsWith("Saved") ? "text-green-800" : "text-red-700"}`}>
            {videoAttachStatus}
          </p>
        ) : null}
        {videoPreview ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,200px)_1fr]">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
                {videoPreview.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- YouTube CDN
                  <img src={videoPreview.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-slate-900">{videoPreview.title}</p>
                {videoPreview.lessonTitle ? (
                  <p className="text-xs text-slate-500">Lesson: {videoPreview.lessonTitle}</p>
                ) : null}
                <p className="text-xs text-slate-500">ID: {videoPreview.videoId}</p>
                {videoPreview.duration ? <p className="text-sm text-slate-600">Duration: {videoPreview.duration}</p> : null}
                {videoPreview.description ? (
                  <p className="line-clamp-4 text-sm text-slate-600">{videoPreview.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
