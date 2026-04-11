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

function CurriculumLessonPicker(props: {
  pickerTree: PickerAgeGroup[] | null
  pickerTreeLoading: boolean
  pickAgeId: string
  setPickAgeId: (id: string) => void
  pickSubjectId: string
  setPickSubjectId: (id: string) => void
  pickUnitId: string
  setPickUnitId: (id: string) => void
  pickLessonId: string
  setPickLessonId: (id: string) => void
  selectedAge: PickerAgeGroup | null
  selectedSubject: PickerSubject | null
  selectedUnit: PickerUnit | null
  selectedLesson: PickerLesson | null
  onLessonChange?: () => void
}) {
  const {
    pickerTree,
    pickerTreeLoading,
    pickAgeId,
    setPickAgeId,
    pickSubjectId,
    setPickSubjectId,
    pickUnitId,
    setPickUnitId,
    pickLessonId,
    setPickLessonId,
    selectedAge,
    selectedSubject,
    selectedUnit,
    selectedLesson,
    onLessonChange,
  } = props

  if (pickerTreeLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading all age bands, subjects, units, and lessons…
      </div>
    )
  }

  if (!pickerTree?.length) {
    return <p className="text-sm text-amber-800">No curriculum data found. Seed or import curriculum first.</p>
  }

  return (
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
            onLessonChange?.()
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select level (e.g. Little Explorers)" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(60vh,320px)]">
            {pickerTree.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.stageName} ({g.name}, focus age {g.ageMin})
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
            onLessonChange?.()
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectedAge ? "Select subject" : "Select age band first"} />
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
            onLessonChange?.()
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
        <Label>Lesson (maps to student lesson page)</Label>
        <Select
          value={pickLessonId || undefined}
          disabled={!selectedUnit}
          onValueChange={(id) => {
            setPickLessonId(id)
            onLessonChange?.()
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectedUnit ? "Select lesson" : "Select unit first"} />
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
      {selectedLesson && selectedAge && selectedSubject ? (
        <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800">
          <p className="font-medium text-slate-900">Tagged for student view</p>
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Curriculum age {selectedAge.ageMin}</span> (focus age for{" "}
            {selectedAge.stageName}) · <span className="font-semibold text-slate-800">Subject:</span> {selectedSubject.name}{" "}
            · <span className="font-semibold text-slate-800">Lesson title:</span> {selectedLesson.title}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">Lesson ID: {selectedLesson.id}</p>
        </div>
      ) : null}
    </div>
  )
}

export default function CurriculumAdminClient() {
  const [resourceType, setResourceType] = useState<(typeof TYPES)[number]>("pdf")
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

  useEffect(() => {
    if (selectedLesson?.title) {
      setTitle(selectedLesson.title)
    }
  }, [selectedLesson?.id, selectedLesson?.title])

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

  const submitResource = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (!selectedAge || !selectedSubject || !selectedLesson) {
      setStatus("Select age band, subject, unit, and lesson above first.")
      return
    }
    const ageStr = String(selectedAge.ageMin)
    const subjectStr = selectedSubject.name.trim()
    const topicStr = selectedLesson.title.trim()
    if (!title.trim()) {
      setStatus("Enter a title for this resource.")
      return
    }
    if (resourceType === "youtube" && !youtubeUrl.trim()) {
      setStatus("Enter a YouTube URL.")
      return
    }
    if (resourceType !== "youtube" && !file) {
      setStatus("Choose a file to upload.")
      return
    }

    setLoading(true)
    try {
      const form = new FormData()
      form.append("age", ageStr)
      form.append("subject", subjectStr)
      form.append("topic", topicStr)
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
      setStatus(`Saved for lesson "${topicStr}" (${subjectStr}, age ${ageStr}). URL: ${data.resource?.url ?? "ok"}`)
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
          <p className="text-sm text-slate-600">
            Choose a lesson from your live curriculum tree. PDFs, slides, and extra YouTube links are stored with the same
            subject name and lesson title students see—no manual typing.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">← Admin</Link>
        </Button>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Select lesson</h2>
          <p className="mt-1 text-sm text-slate-600">
            Data is loaded from <code className="rounded bg-slate-100 px-1 text-xs">/api/admin/curriculum/lesson-picker</code>{" "}
            (all bands, subjects, units, lessons).
          </p>
        </div>
        <CurriculumLessonPicker
          pickerTree={pickerTree}
          pickerTreeLoading={pickerTreeLoading}
          pickAgeId={pickAgeId}
          setPickAgeId={setPickAgeId}
          pickSubjectId={pickSubjectId}
          setPickSubjectId={setPickSubjectId}
          pickUnitId={pickUnitId}
          setPickUnitId={setPickUnitId}
          pickLessonId={pickLessonId}
          setPickLessonId={setPickLessonId}
          selectedAge={selectedAge}
          selectedSubject={selectedSubject}
          selectedUnit={selectedUnit}
          selectedLesson={selectedLesson}
          onLessonChange={() => {
            setVideoPreview(null)
            setVideoAttachStatus(null)
          }}
        />
      </section>

      <form onSubmit={submitResource} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Upload file or extra YouTube link</h2>
          <p className="mt-1 text-sm text-slate-600">
            For the lesson selected above. This is separate from &quot;Save to lesson&quot; YouTube embeds (lesson ID table).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shown to students / in lists" />
        </div>
        {resourceType === "youtube" ? (
          <div className="space-y-2">
            <Label>YouTube URL (embed only — no downloads)</Label>
            <Input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        )}
        {status && <p className="text-sm text-slate-700">{status}</p>}
        <Button
          type="submit"
          disabled={loading || !selectedLesson}
          className="w-full sm:w-auto"
          title={!selectedLesson ? "Select a lesson in step 1 first" : undefined}
        >
          {loading ? "Saving…" : "Save resource"}
        </Button>
        <p className="text-xs text-slate-500">
          Students see these under &quot;Lesson materials&quot; when their level matches curriculum age {selectedAge?.ageMin ?? "—"},{" "}
          subject matches, and they open this exact lesson.
        </p>
      </form>

      <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Lesson YouTube video (embed by lesson ID)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Uses the same lesson as in step 1. Metadata is loaded with{" "}
            <code className="rounded bg-white/80 px-1 text-xs">YOUTUBE_API_KEY</code> on the server only. Students only see
            embeds for lessons they can access.
          </p>
        </div>

        {lessonPickerSummary ? (
          <p className="rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-sm text-slate-800">
            <span className="font-medium text-violet-900">Attaching to:</span> {lessonPickerSummary}
          </p>
        ) : (
          <p className="text-sm text-amber-800">Select a full lesson in step 1 to enable saving.</p>
        )}

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
          <Button type="button" disabled={videoSaveLoading || !videoPreview || !pickLessonId} onClick={() => void saveLessonVideo()}>
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
