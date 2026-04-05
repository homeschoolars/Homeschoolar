"use client"

import { useEffect, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"

type AgeOption = { name: string; label?: string }

const LABELS: Record<string, string> = {
  "4-5": "Little Explorers",
  "6-7": "Curious Minds",
  "8-9": "Growing Learners",
  "10-11": "Knowledge Builders",
  "12-13": "Future Leaders",
}

type ParentCurriculumImportProps = {
  defaultAgeGroup: string
}

export function ParentCurriculumImport({ defaultAgeGroup }: ParentCurriculumImportProps) {
  const [ageGroups, setAgeGroups] = useState<AgeOption[]>([])
  const [ageGroup, setAgeGroup] = useState(defaultAgeGroup)

  useEffect(() => {
    setAgeGroup(defaultAgeGroup)
  }, [defaultAgeGroup])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch("/api/age-groups")
        if (!res.ok) return
        const payload = (await res.json()) as { ageGroups?: Array<{ name: string; stageName?: string }> }
        const rows = (payload.ageGroups ?? []).map((a) => ({
          name: a.name,
          label: a.stageName ?? LABELS[a.name] ?? a.name,
        }))
        rows.sort((a, b) => Number(a.name.split("-")[0]) - Number(b.name.split("-")[0]))
        setAgeGroups(rows)
      } catch {
        setAgeGroups([{ name: defaultAgeGroup, label: LABELS[defaultAgeGroup] ?? defaultAgeGroup }])
      }
    }
    void load()
  }, [defaultAgeGroup])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = async () => {
    if (!file || !ageGroup) {
      setError("Choose an age band and a JSON file.")
      return
    }
    setUploading(true)
    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append("ageGroup", ageGroup)
      formData.append("file", file)

      const res = await apiFetch("/api/parent/curriculum/import", {
        method: "POST",
        body: formData,
      })
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        imported?: { subjects: number; units: number; lessons: number }
        error?: string
      }
      if (!res.ok) {
        throw new Error(payload.error ?? "Import failed")
      }
      setMessage(
        `Imported ${payload.imported?.subjects ?? 0} subjects, ${payload.imported?.units ?? 0} units, ${payload.imported?.lessons ?? 0} lessons.`,
      )
      setFile(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base tracking-tight text-slate-800">Upload curriculum (JSON)</CardTitle>
        <CardDescription>
          Same structured format as admin import: subjects → units → lessons, optional lectures and prompts. Merges into
          the selected age band.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-w-xs space-y-1">
          <Label>Age band</Label>
          <Select value={ageGroup} onValueChange={setAgeGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Age group" />
            </SelectTrigger>
            <SelectContent>
              {(ageGroups.length ? ageGroups : [{ name: ageGroup, label: ageGroup }]).map((a) => (
                <SelectItem key={a.name} value={a.name}>
                  {a.label ?? a.name} ({a.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto] items-end">
          <div>
            <Label className="sr-only">JSON file</Label>
            <Input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="button" onClick={upload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import
          </Button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-teal-800">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
