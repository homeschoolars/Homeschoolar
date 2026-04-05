"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, Save, Upload } from "lucide-react"

type AgeGroupNode = { id: string; name: string; stageName?: string }
type SubjectNode = { id: string; name: string; slug: string; displayOrder: number }
type UnitNode = { id: string; title: string; slug: string; displayOrder: number }
type LessonNode = { id: string; title: string; slug: string; displayOrder: number }

type LessonPromptKind = "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"

type LessonDetail = {
  id: string
  title: string
  slug: string
  displayOrder: number
  content: {
    storyText: string
    activityInstructions: string
    quizConcept: string
    worksheetExample: string
    parentTip: string
  } | null
  aiPrompts: Array<{ id: string; type: LessonPromptKind; promptTemplate: string }>
}

type LessonEditorState = {
  title: string
  slug: string
  displayOrder: number
  storyText: string
  activityInstructions: string
  quizConcept: string
  worksheetExample: string
  parentTip: string
  storyPrompt: string
  worksheetPrompt: string
  quizPrompt: string
  projectPrompt: string
  debatePrompt: string
  researchPrompt: string
  reflectionPrompt: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function getAgeStart(ageGroup: string) {
  const first = ageGroup.split("-")[0]
  const parsed = Number.parseInt(first, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

const AGE_GROUP_STAGE_MAP: Record<string, string> = {
  "4-5": "Little Explorers 🌱",
  "5-6": "Mini Adventurers 🐾",
  "6-7": "Curious Minds 🔍",
  "7-8": "Young Investigators 🧩",
  "8-9": "Growing Learners 💡",
  "9-10": "Knowledge Explorers 🚀",
  "10-11": "Knowledge Builders 🏗️",
  "11-12": "Skill Sharpeners ⚡",
  "12-13": "Future Leaders 🌟",
}

export function CurriculumManagement() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [importingHtml, setImportingHtml] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [ageGroups, setAgeGroups] = useState<AgeGroupNode[]>([])
  const [subjects, setSubjects] = useState<SubjectNode[]>([])
  const [units, setUnits] = useState<UnitNode[]>([])
  const [lessons, setLessons] = useState<LessonNode[]>([])

  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedUnitId, setSelectedUnitId] = useState<string>("")
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")

  const [subjectForm, setSubjectForm] = useState({ name: "", slug: "" })
  const [unitForm, setUnitForm] = useState({ title: "", slug: "" })
  const [lessonCreateForm, setLessonCreateForm] = useState({
    title: "",
    slug: "",
    storyText: "",
    activityInstructions: "",
    quizConcept: "",
    worksheetExample: "",
    parentTip: "",
  })
  const [lessonEditor, setLessonEditor] = useState<LessonEditorState | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [htmlUploadFile, setHtmlUploadFile] = useState<File | null>(null)

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId]
  )
  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedUnitId) ?? null, [units, selectedUnitId])

  const loadAgeGroups = async () => {
    const res = await apiFetch("/api/curriculum/age-groups")
    if (!res.ok) throw new Error("Failed to load age groups")
    const payload = (await res.json()) as { ageGroups: AgeGroupNode[] }
    const sortedAgeGroups = [...payload.ageGroups].sort((a, b) => getAgeStart(a.name) - getAgeStart(b.name))
    setAgeGroups(sortedAgeGroups)
    if (!selectedAgeGroup && sortedAgeGroups.length > 0) {
      setSelectedAgeGroup(sortedAgeGroups[0].name)
    }
  }

  const loadSubjects = async (ageGroup: string) => {
    const res = await apiFetch(`/api/curriculum/subjects?ageGroup=${encodeURIComponent(ageGroup)}`)
    if (!res.ok) throw new Error("Failed to load subjects")
    const payload = (await res.json()) as { subjects: SubjectNode[] }
    setSubjects(payload.subjects)
    setSelectedSubjectId((prev) => (payload.subjects.some((s) => s.id === prev) ? prev : payload.subjects[0]?.id ?? ""))
  }

  const loadUnits = async (subjectId: string) => {
    if (!subjectId) {
      setUnits([])
      setSelectedUnitId("")
      return
    }
    const res = await apiFetch(`/api/curriculum/units?subjectId=${encodeURIComponent(subjectId)}`)
    if (!res.ok) throw new Error("Failed to load units")
    const payload = (await res.json()) as { units: UnitNode[] }
    setUnits(payload.units)
    setSelectedUnitId((prev) => (payload.units.some((u) => u.id === prev) ? prev : payload.units[0]?.id ?? ""))
  }

  const loadLessons = async (unitId: string) => {
    if (!unitId) {
      setLessons([])
      setSelectedLessonId("")
      return
    }
    const res = await apiFetch(`/api/curriculum/lessons?unitId=${encodeURIComponent(unitId)}`)
    if (!res.ok) throw new Error("Failed to load lessons")
    const payload = (await res.json()) as { lessons: LessonNode[] }
    setLessons(payload.lessons)
    setSelectedLessonId((prev) => (payload.lessons.some((l) => l.id === prev) ? prev : payload.lessons[0]?.id ?? ""))
  }

  const loadLessonDetail = async (lessonId: string) => {
    if (!lessonId) {
      setLessonEditor(null)
      return
    }
    const res = await apiFetch(`/api/curriculum/lessons/${encodeURIComponent(lessonId)}`)
    if (!res.ok) throw new Error("Failed to load lesson detail")
    const payload = (await res.json()) as { lesson: LessonDetail }
    const storyPrompt = payload.lesson.aiPrompts.find((p) => p.type === "story")?.promptTemplate ?? ""
    const worksheetPrompt = payload.lesson.aiPrompts.find((p) => p.type === "worksheet")?.promptTemplate ?? ""
    const quizPrompt = payload.lesson.aiPrompts.find((p) => p.type === "quiz")?.promptTemplate ?? ""
    const projectPrompt = payload.lesson.aiPrompts.find((p) => p.type === "project")?.promptTemplate ?? ""
    const debatePrompt = payload.lesson.aiPrompts.find((p) => p.type === "debate")?.promptTemplate ?? ""
    const researchPrompt = payload.lesson.aiPrompts.find((p) => p.type === "research")?.promptTemplate ?? ""
    const reflectionPrompt = payload.lesson.aiPrompts.find((p) => p.type === "reflection")?.promptTemplate ?? ""
    setLessonEditor({
      title: payload.lesson.title,
      slug: payload.lesson.slug,
      displayOrder: payload.lesson.displayOrder,
      storyText: payload.lesson.content?.storyText ?? "",
      activityInstructions: payload.lesson.content?.activityInstructions ?? "",
      quizConcept: payload.lesson.content?.quizConcept ?? "",
      worksheetExample: payload.lesson.content?.worksheetExample ?? "",
      parentTip: payload.lesson.content?.parentTip ?? "",
      storyPrompt,
      worksheetPrompt,
      quizPrompt,
      projectPrompt,
      debatePrompt,
      researchPrompt,
      reflectionPrompt,
    })
  }

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      setError(null)
      try {
        await loadAgeGroups()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load curriculum")
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedAgeGroup) return
    const run = async () => {
      setError(null)
      try {
        await loadSubjects(selectedAgeGroup)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load subjects")
      }
    }
    void run()
  }, [selectedAgeGroup])

  useEffect(() => {
    const run = async () => {
      setError(null)
      try {
        await loadUnits(selectedSubjectId)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load units")
      }
    }
    void run()
  }, [selectedSubjectId])

  useEffect(() => {
    const run = async () => {
      setError(null)
      try {
        await loadLessons(selectedUnitId)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lessons")
      }
    }
    void run()
  }, [selectedUnitId])

  useEffect(() => {
    const run = async () => {
      setError(null)
      try {
        await loadLessonDetail(selectedLessonId)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lesson detail")
      }
    }
    void run()
  }, [selectedLessonId])

  const createSubject = async () => {
    if (!selectedAgeGroup || !subjectForm.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch("/api/curriculum/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: selectedAgeGroup,
          name: subjectForm.name.trim(),
          slug: subjectForm.slug.trim() || slugify(subjectForm.name),
          displayOrder: subjects.length + 1,
        }),
      })
      setSubjectForm({ name: "", slug: "" })
      await loadSubjects(selectedAgeGroup)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create subject")
    } finally {
      setSaving(false)
    }
  }

  const createUnit = async () => {
    if (!selectedSubjectId || !unitForm.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch("/api/curriculum/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          title: unitForm.title.trim(),
          slug: unitForm.slug.trim() || slugify(unitForm.title),
          displayOrder: units.length + 1,
        }),
      })
      setUnitForm({ title: "", slug: "" })
      await loadUnits(selectedSubjectId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create unit")
    } finally {
      setSaving(false)
    }
  }

  const createLesson = async () => {
    if (!selectedUnitId || !lessonCreateForm.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch("/api/curriculum/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnitId,
          title: lessonCreateForm.title.trim(),
          slug: lessonCreateForm.slug.trim() || slugify(lessonCreateForm.title),
          displayOrder: lessons.length + 1,
          content: {
            storyText: lessonCreateForm.storyText,
            activityInstructions: lessonCreateForm.activityInstructions,
            quizConcept: lessonCreateForm.quizConcept,
            worksheetExample: lessonCreateForm.worksheetExample,
            parentTip: lessonCreateForm.parentTip,
          },
        }),
      })
      setLessonCreateForm({
        title: "",
        slug: "",
        storyText: "",
        activityInstructions: "",
        quizConcept: "",
        worksheetExample: "",
        parentTip: "",
      })
      await loadLessons(selectedUnitId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lesson")
    } finally {
      setSaving(false)
    }
  }

  const saveLesson = async () => {
    if (!selectedLessonId || !lessonEditor) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/curriculum/lessons/${encodeURIComponent(selectedLessonId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonEditor.title,
          slug: lessonEditor.slug,
          displayOrder: lessonEditor.displayOrder,
          content: {
            storyText: lessonEditor.storyText,
            activityInstructions: lessonEditor.activityInstructions,
            quizConcept: lessonEditor.quizConcept,
            worksheetExample: lessonEditor.worksheetExample,
            parentTip: lessonEditor.parentTip,
          },
          prompts: {
            story: lessonEditor.storyPrompt,
            worksheet: lessonEditor.worksheetPrompt,
            quiz: lessonEditor.quizPrompt,
            project: lessonEditor.projectPrompt,
            debate: lessonEditor.debatePrompt,
            research: lessonEditor.researchPrompt,
            reflection: lessonEditor.reflectionPrompt,
          },
        }),
      })
      await loadLessonDetail(selectedLessonId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save lesson")
    } finally {
      setSaving(false)
    }
  }

  const removeSubject = async () => {
    if (!selectedSubjectId) return
    if (!window.confirm("Delete selected subject and all nested curriculum?")) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/curriculum/subjects/${encodeURIComponent(selectedSubjectId)}`, { method: "DELETE" })
      await loadSubjects(selectedAgeGroup)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete subject")
    } finally {
      setSaving(false)
    }
  }

  const removeUnit = async () => {
    if (!selectedUnitId) return
    if (!window.confirm("Delete selected unit and all lessons?")) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/curriculum/units/${encodeURIComponent(selectedUnitId)}`, { method: "DELETE" })
      await loadUnits(selectedSubjectId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete unit")
    } finally {
      setSaving(false)
    }
  }

  const removeLesson = async () => {
    if (!selectedLessonId) return
    if (!window.confirm("Delete selected lesson?")) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/curriculum/lessons/${encodeURIComponent(selectedLessonId)}`, { method: "DELETE" })
      await loadLessons(selectedUnitId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete lesson")
    } finally {
      setSaving(false)
    }
  }

  const ensureAgeGroups = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch("/api/curriculum/age-groups", { method: "POST" })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to ensure age groups")
      }
      await loadAgeGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ensure age groups")
    } finally {
      setSaving(false)
    }
  }

  const uploadCurriculumFile = async () => {
    if (!selectedAgeGroup || !uploadFile) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("ageGroup", selectedAgeGroup)
      formData.append("file", uploadFile)

      const res = await apiFetch("/api/curriculum/import", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to upload curriculum")
      }

      setUploadFile(null)
      await loadSubjects(selectedAgeGroup)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload curriculum")
    } finally {
      setUploading(false)
    }
  }

  const downloadCurriculumTemplate = () => {
    const age = selectedAgeGroup || "4-5"
    const stageName = AGE_GROUP_STAGE_MAP[age] ?? "Foundation"
    const template = {
      ageGroup: age,
      stageName,
      subjects: [
        {
          name: "English",
          slug: "english",
          displayOrder: 1,
          units: [
            {
              title: "Reading Basics",
              slug: "reading-basics",
              displayOrder: 1,
              lessons: [
                {
                  title: "Sounds and Letters",
                  slug: "sounds-and-letters",
                  displayOrder: 1,
                  difficultyIndicator: "foundation",
                  content: {
                    storyText: "Short static story text...",
                    activityInstructions: "Activity steps for the learner...",
                    quizConcept: "Core concept to assess...",
                    worksheetExample: "Worksheet example prompt...",
                    parentTip: "A helpful tip for parents...",
                  },
                  prompts: {
                    story: "Create an age-appropriate story about {{lessonTitle}}.",
                    worksheet: "Create a worksheet for {{lessonTitle}}.",
                    quiz: "Create a quiz for {{lessonTitle}}.",
                  },
                },
              ],
            },
          ],
        },
      ],
    }

    const content = JSON.stringify(template, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `curriculum-template-age-${age}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importCurriculumHtml = async () => {
    if (!htmlUploadFile) return
    setImportingHtml(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", htmlUploadFile)

      const res = await apiFetch("/api/curriculum/import-html", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to import HTML curriculum")
      }

      setHtmlUploadFile(null)
      await loadAgeGroups()
      if (selectedAgeGroup) {
        await loadSubjects(selectedAgeGroup)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import HTML curriculum")
    } finally {
      setImportingHtml(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Curriculum Manager</CardTitle>
          <CardDescription>Manage age groups, subjects, units, lessons, static content, and AI prompts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading curriculum...
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>Age Group</Label>
                <Select value={selectedAgeGroup || "none"} onValueChange={(value) => setSelectedAgeGroup(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select age group
                    </SelectItem>
                    {ageGroups.map((age) => (
                      <SelectItem key={age.id} value={age.name}>
                        {age.stageName ? `${age.stageName} (${age.name})` : age.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={selectedSubjectId || "none"} onValueChange={(value) => setSelectedSubjectId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select subject
                    </SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={selectedUnitId || "none"} onValueChange={(value) => setSelectedUnitId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select unit
                    </SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lesson</Label>
                <Select value={selectedLessonId || "none"} onValueChange={(value) => setSelectedLessonId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select lesson
                    </SelectItem>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Age Group Setup & Content Upload</CardTitle>
          <CardDescription>
            Ensure all required age groups exist, then upload a curriculum JSON file for the selected age group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={ensureAgeGroups} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ensure 9 Age Groups
            </Button>
            <Button variant="secondary" onClick={downloadCurriculumTemplate}>
              Download JSON Template
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            <Button onClick={uploadCurriculumFile} disabled={!selectedAgeGroup || !uploadFile || uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload JSON
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Expected JSON root shape: <code>{'{ "subjects": [...], "stageName"?: "..." }'}</code> and each lesson may
            include content/prompts.
          </p>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Import structured curriculum from HTML file</p>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                type="file"
                accept=".html,text/html"
                onChange={(e) => setHtmlUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button onClick={importCurriculumHtml} disabled={!htmlUploadFile || importingHtml}>
                {importingHtml ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import HTML (All Ages)
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Use this for files like <code>homeschoolars_curriculum_content.html</code>. It imports all age groups from
              4-5 through 12-13 in one run.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Create Subject</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Subject name"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
            />
            <Input
              placeholder="subject-slug"
              value={subjectForm.slug}
              onChange={(e) => setSubjectForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={createSubject} disabled={saving || !selectedAgeGroup} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
              <Button variant="destructive" onClick={removeSubject} disabled={saving || !selectedSubject}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Unit title"
              value={unitForm.title}
              onChange={(e) => setUnitForm((prev) => ({ ...prev, title: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
            />
            <Input
              placeholder="unit-slug"
              value={unitForm.slug}
              onChange={(e) => setUnitForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={createUnit} disabled={saving || !selectedSubjectId} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
              <Button variant="destructive" onClick={removeUnit} disabled={saving || !selectedUnit}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Lesson</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Lesson title"
              value={lessonCreateForm.title}
              onChange={(e) =>
                setLessonCreateForm((prev) => ({ ...prev, title: e.target.value, slug: prev.slug || slugify(e.target.value) }))
              }
            />
            <Input
              placeholder="lesson-slug"
              value={lessonCreateForm.slug}
              onChange={(e) => setLessonCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <Textarea
              placeholder="Story text"
              value={lessonCreateForm.storyText}
              onChange={(e) => setLessonCreateForm((prev) => ({ ...prev, storyText: e.target.value }))}
            />
            <Textarea
              placeholder="Activity instructions"
              value={lessonCreateForm.activityInstructions}
              onChange={(e) => setLessonCreateForm((prev) => ({ ...prev, activityInstructions: e.target.value }))}
            />
            <Textarea
              placeholder="Quiz concept"
              value={lessonCreateForm.quizConcept}
              onChange={(e) => setLessonCreateForm((prev) => ({ ...prev, quizConcept: e.target.value }))}
            />
            <Textarea
              placeholder="Worksheet example"
              value={lessonCreateForm.worksheetExample}
              onChange={(e) => setLessonCreateForm((prev) => ({ ...prev, worksheetExample: e.target.value }))}
            />
            <Textarea
              placeholder="Parent tip"
              value={lessonCreateForm.parentTip}
              onChange={(e) => setLessonCreateForm((prev) => ({ ...prev, parentTip: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={createLesson} disabled={saving || !selectedUnitId} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Add Lesson
              </Button>
              <Button variant="destructive" onClick={removeLesson} disabled={saving || !selectedLessonId}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Editor</CardTitle>
          <CardDescription>Edit content and reusable AI prompts for the selected lesson.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!lessonEditor ? (
            <p className="text-sm text-slate-500">Select a lesson to edit.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={lessonEditor.title}
                    onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={lessonEditor.slug}
                    onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, slug: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={lessonEditor.displayOrder}
                    onChange={(e) =>
                      setLessonEditor((prev) =>
                        prev ? { ...prev, displayOrder: Number.parseInt(e.target.value || "0", 10) || 0 } : prev
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Story</Label>
                  <Textarea
                    value={lessonEditor.storyText}
                    onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, storyText: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <Label>Activity Instructions</Label>
                  <Textarea
                    value={lessonEditor.activityInstructions}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, activityInstructions: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <Label>Quiz Concept</Label>
                  <Textarea
                    value={lessonEditor.quizConcept}
                    onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, quizConcept: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <Label>Worksheet Example</Label>
                  <Textarea
                    value={lessonEditor.worksheetExample}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, worksheetExample: e.target.value } : prev))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Parent Tip</Label>
                <Textarea
                  value={lessonEditor.parentTip}
                  onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, parentTip: e.target.value } : prev))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-7">
                <div>
                  <Label>Story Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.storyPrompt}
                    onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, storyPrompt: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <Label>Worksheet Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.worksheetPrompt}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, worksheetPrompt: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <Label>Quiz Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.quizPrompt}
                    onChange={(e) => setLessonEditor((prev) => (prev ? { ...prev, quizPrompt: e.target.value } : prev))}
                  />
                </div>
                <div>
                  <Label>Project Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.projectPrompt}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, projectPrompt: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <Label>Reflection Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.reflectionPrompt}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, reflectionPrompt: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <Label>Debate Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.debatePrompt}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, debatePrompt: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <Label>Research Prompt Template</Label>
                  <Textarea
                    value={lessonEditor.researchPrompt}
                    onChange={(e) =>
                      setLessonEditor((prev) => (prev ? { ...prev, researchPrompt: e.target.value } : prev))
                    }
                  />
                </div>
              </div>

              <Button onClick={saveLesson} disabled={saving} className="min-w-40">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Lesson
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
