"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"
import { extractYouTubeVideoId } from "@/lib/youtube"

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

type PickerLesson = { id: string; title: string; slug: string }
type PickerUnit = { id: string; title: string; slug: string; lessons: PickerLesson[] }
type PickerSubject = { id: string; name: string; slug: string; units: PickerUnit[] }
type PickerAgeGroup = {
  id: string
  name: string
  stageName: string
  ageMin: number
  ageMax: number
  subjects: PickerSubject[]
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

  const [pickerTree, setPickerTree] = useState<PickerAgeGroup[] | null>(null)
  const [pickerTreeLoading, setPickerTreeLoading] = useState(true)
  const [pickAgeId, setPickAgeId] = useState("")
  const [pickSubjectId, setPickSubjectId] = useState("")
  const [pickUnitId, setPickUnitId] = useState("")
  const [pickLessonId, setPickLessonId] = useState("")

  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState("")
  const [videoPreview, setVideoPreview] = useState<VideoPreviewPayload | null>(null)
  const [videoAttachStatus, setVideoAttachStatus] = useState<string | null>(null)
  const [videoPreviewLoading, setVideoPreviewLoading] = useState(false)
  const [videoSaveLoading, setVideoSaveLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setPickerTreeLoading(true)
      try {
        const res = await apiFetch("/api/admin/curriculum/lesson-picker", { credentials: "include" })
        const data = (await res.json()) as { ageGroups?: PickerAgeGroup[]; error?: string }
        if (!cancelled && res.ok && data.ageGroups) {
          setPickerTree(data.ageGroups)
        }
      } catch {
        if (!cancelled) setPickerTree([])
      } finally {
        if (!cancelled) setPickerTreeLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedAge = useMemo(
    () => pickerTree?.find((g) => g.id === pickAgeId) ?? null,
    [pickerTree, pickAgeId],
  )
  const selectedSubject = useMemo(
    () => selectedAge?.subjects.find((s) => s.id === pickSubjectId) ?? null,
    [selectedAge, pickSubjectId],
  )
  const selectedUnit = useMemo(
    () => selectedSubject?.units.find((u) => u.id === pickUnitId) ?? null,
    [selectedSubject, pickUnitId],
  )
  const selectedLesson = useMemo(
    () => selectedUnit?.lessons.find((l) => l.id === pickLessonId) ?? null,
    [selectedUnit, pickLessonId],
  )

  const lessonPickerSummary = useMemo(() => {
    if (!selectedLesson || !selectedAge) return null
    return `${selectedAge.stageName} · ${selectedSubject?.name ?? "—"} · ${selectedUnit?.title ?? "—"} · ${selectedLesson.title}`
  }, [selectedAge, selectedSubject, selectedUnit, selectedLesson])

  const fetchVideoPreview = useCallback(
    async (url: string) => {
      const trimmedLesson = pickLessonId.trim()
      const trimmedUrl = url.trim()
      setVideoAttachStatus(null)
      if (!trimmedLesson) {
        setVideoAttachStatus("Choose age band, subject, unit, and lesson first.")
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
    [pickLessonId],
  )

  const saveLessonVideo = async () => {
    const trimmedLesson = pickLessonId.trim()
    const trimmedUrl = lessonYoutubeUrl.trim()
    setVideoAttachStatus(null)
    if (!trimmedLesson || !trimmedUrl) {
      setVideoAttachStatus("Choose a lesson and enter a YouTube URL.")
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

  const applyLessonPickerToResourceForm = () => {
    if (!selectedAge || !selectedSubject || !selectedLesson) {
      setStatus("Select age band, subject, unit, and lesson in the section below first.")
      return
    }
    const mid = Math.round((selectedAge.ageMin + selectedAge.ageMax) / 2)
    setAge(String(mid))
    setSubject(selectedSubject.name)
    setTopic(selectedLesson.title)
    setStatus(
      `Form filled: age ${mid} (any age ${selectedAge.ageMin}–${selectedAge.ageMax} matches students in this band), subject "${selectedSubject.name}", topic "${selectedLesson.title}". Add a title and file, then Save resource.`,
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 md:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Curriculum resources</h1>
          <p className="text-sm text-slate-600">
            Tag uploads by age, subject, and topic. Topic must match the lesson title exactly; use the button below to copy
            from the lesson picker.
          </p>
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={applyLessonPickerToResourceForm}>
            Fill from lesson picker (below)
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Saving…" : "Save resource"}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          PDFs and slides appear on the student lesson page when age, subject, and topic match. YouTube for lessons uses the
          separate &quot;Lesson YouTube video&quot; section (linked by lesson ID).
        </p>
      </form>

      <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Lesson YouTube video</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick the lesson from your curriculum, then paste the video link. Metadata is loaded with{" "}
            <code className="rounded bg-white/80 px-1 text-xs">YOUTUBE_API_KEY</code> on the server only. Students only see
            embeds for lessons they can access.
          </p>
        </div>

        {pickerTreeLoading ? (
          <div className="flex items-center gap-2 text-sm text-violet-900">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading curriculum…
          </div>
        ) : !pickerTree?.length ? (
          <p className="text-sm text-amber-800">No curriculum data found. Seed or import curriculum first.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Age band / stage</Label>
              <Select
                value={pickAgeId || undefined}
                onValueChange={(id) => {
                  setPickAgeId(id)
                  setPickSubjectId("")
                  setPickUnitId("")
                  setPickLessonId("")
                  setVideoPreview(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level (e.g. Little Explorers)" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,320px)]">
                  {pickerTree.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.stageName} ({g.name}, ages {g.ageMin}–{g.ageMax})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Subject</Label>
              <Select
                value={pickSubjectId || undefined}
                disabled={!selectedAge}
                onValueChange={(id) => {
                  setPickSubjectId(id)
                  setPickUnitId("")
                  setPickLessonId("")
                  setVideoPreview(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedAge ? "e.g. Mathematics" : "Select age band first"} />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,320px)]">
                  {(selectedAge?.subjects ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Unit</Label>
              <Select
                value={pickUnitId || undefined}
                disabled={!selectedSubject}
                onValueChange={(id) => {
                  setPickUnitId(id)
                  setPickLessonId("")
                  setVideoPreview(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedSubject ? "Select unit" : "Select subject first"} />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,320px)]">
                  {(selectedSubject?.units ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Lesson</Label>
              <Select
                value={pickLessonId || undefined}
                disabled={!selectedUnit}
                onValueChange={(id) => {
                  setPickLessonId(id)
                  setVideoPreview(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedUnit ? "e.g. Counting 1-20" : "Select unit first"} />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,360px)]">
                  {(selectedUnit?.lessons ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {lessonPickerSummary ? (
          <p className="rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-sm text-slate-800">
            <span className="font-medium text-violet-900">Attaching to:</span> {lessonPickerSummary}
          </p>
        ) : null}

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
                const id = extractYouTubeVideoId(pasted)
                const normalized = id ? `https://www.youtube.com/watch?v=${id}` : pasted
                setLessonYoutubeUrl(normalized)
                queueMicrotask(() => void fetchVideoPreview(normalized))
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
