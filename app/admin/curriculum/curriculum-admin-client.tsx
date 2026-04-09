"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"

const AGES = Array.from({ length: 10 }, (_, i) => i + 4)
const TYPES = ["youtube", "pdf", "ppt", "image", "video", "audio", "word"] as const

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
    </div>
  )
}
