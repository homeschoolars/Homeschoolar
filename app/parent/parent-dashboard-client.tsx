"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  BookOpen,
  Plus,
  Users,
  Star,
  Check,
  CreditCard,
  TrendingUp,
  Calendar,
  ChevronRight,
  Sparkles,
  FileText,
  BarChart3,
  Upload,
} from "lucide-react"
import type {
  Profile,
  Child,
  Subject,
  Subscription,
  AttentionSpan,
  LearningMode,
  LearningStyle,
  Religion,
  ScreenTolerance,
} from "@/lib/types"
import { RecommendationsPanel } from "@/components/ai/recommendations-panel"
import { CurriculumPlanCard } from "@/components/ai/curriculum-plan-card"
import { CurriculumPDFActions, AssessmentPDFActions } from "@/components/pdf/pdf-actions"
import { RoadmapViewer } from "@/components/dashboards/parent/roadmap-viewer"
import { WeeklyAIInsights } from "@/components/dashboards/parent/weekly-ai-insights"
import { QuickContentActions } from "@/components/parent/quick-content-actions"
import { FullLessonGenerator } from "@/components/parent/full-lesson-generator"
import { ParentCurriculumImport } from "@/components/parent/parent-curriculum-import"
import { LessonWorksheetAssigner } from "@/components/parent/lesson-worksheet-assigner"
import { apiFetch } from "@/lib/api-client"
import { ParentAppHeader } from "@/components/layout/parent-app-header"
import { AssessmentCompleteToast } from "@/components/parent/assessment-complete-toast"
import {
  attentionSpanOptions,
  interestPresets,
  learningModeOptions,
  learningStyleOptions,
  religionOptions,
  screenToleranceOptions,
} from "@/lib/onboarding-options"
import { calculateAgeYears, deriveAgeGroup } from "@/lib/onboarding-utils"

const ParentOverview = dynamic(
  () => import("@/components/dashboards/parent/parent-overview").then((m) => m.ParentOverview),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl border border-slate-200/60 bg-white/60" />
    ),
  },
)

const WorksheetGenerator = dynamic(
  () => import("@/components/ai/worksheet-generator").then((m) => m.WorksheetGenerator),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl border border-slate-200/60 bg-white/60" />
    ),
  },
)

type CurriculumSubjectSummary = {
  id: string
  name: string
  units?: Array<{ id: string; title: string }>
}

interface ParentDashboardClientProps {
  profile: Profile | null
  children: Child[]
  subjectsByAgeGroup: Record<string, Subject[]>
  subscription: Subscription | null
}

export default function ParentDashboardClient({
  profile,
  children: initialChildren,
  subjectsByAgeGroup,
  subscription,
}: ParentDashboardClientProps) {
  const [children, setChildren] = useState<Child[]>(initialChildren)
  const [isAddingChild, setIsAddingChild] = useState(false)
  const [newChildName, setNewChildName] = useState("")
  const [newChildDob, setNewChildDob] = useState("")
  const [newChildGender, setNewChildGender] = useState<"male" | "female" | "other" | "prefer_not_say">(
    "prefer_not_say",
  )
  const [newChildReligion, setNewChildReligion] = useState<Religion>("muslim")
  const [newChildEducation, setNewChildEducation] = useState("")
  const [newChildInterestsPreset, setNewChildInterestsPreset] = useState<string[]>([])
  const [newChildInterestsCustom, setNewChildInterestsCustom] = useState("")
  const [newChildLearningStyles, setNewChildLearningStyles] = useState<LearningStyle[]>([])
  const [newChildAttentionSpan, setNewChildAttentionSpan] = useState<AttentionSpan>("medium")
  const [newChildScreenTolerance, setNewChildScreenTolerance] = useState<ScreenTolerance>("medium")
  const [newChildNeedsEncouragement, setNewChildNeedsEncouragement] = useState(false)
  const [newChildLearnsBetterWith, setNewChildLearnsBetterWith] = useState<LearningMode[]>([])
  const [newChildStrengths, setNewChildStrengths] = useState("")
  const [newChildChallenges, setNewChildChallenges] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    initialChildren.length > 0 ? initialChildren[0].id : null,
  )
  const [orphanDialogOpen, setOrphanDialogOpen] = useState(false)
  const [orphanChildId, setOrphanChildId] = useState<string | null>(null)
  const [orphanDocType, setOrphanDocType] = useState<"death_certificate" | "ngo_letter" | "other">("ngo_letter")
  const [orphanDocFile, setOrphanDocFile] = useState<File | null>(null)
  const [orphanSubmitting, setOrphanSubmitting] = useState(false)
  const [orphanMessage, setOrphanMessage] = useState<string | null>(null)
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubjectSummary[]>([])
  const [curriculumLoading, setCurriculumLoading] = useState(false)
  const orphanInputRef = useRef<HTMLInputElement>(null)

  const selectedChild = children.find((c) => c.id === selectedChildId)
  const curriculumAgeGroup = selectedChild?.age_group ?? "6-7"
  const allDashboardSubjects = useMemo(() => {
    const map = new Map<string, Subject>()
    Object.values(subjectsByAgeGroup)
      .flat()
      .forEach((subject) => {
        map.set(subject.id, subject)
      })
    return Array.from(map.values())
  }, [subjectsByAgeGroup])
  const selectedChildSubjects = selectedChild
    ? (subjectsByAgeGroup[selectedChild.age_group] ?? []).length > 0
      ? (subjectsByAgeGroup[selectedChild.age_group] ?? [])
      : allDashboardSubjects
    : []

  useEffect(() => {
    if (!selectedChild?.age_group) {
      setCurriculumSubjects([])
      return
    }

    const loadCurriculumSubjects = async () => {
      setCurriculumLoading(true)
      try {
        const response = await apiFetch(
          `/api/curriculum/subjects?ageGroup=${encodeURIComponent(selectedChild.age_group)}`,
        )
        const payload = (await response.json()) as { subjects?: CurriculumSubjectSummary[] }
        if (!response.ok) throw new Error("Failed to load curriculum subjects")
        setCurriculumSubjects(payload.subjects ?? [])
      } catch (error) {
        console.error("Error loading curriculum subjects:", error)
        setCurriculumSubjects([])
      } finally {
        setCurriculumLoading(false)
      }
    }

    loadCurriculumSubjects()
  }, [selectedChild?.age_group])

  const handleAddChild = async () => {
    if (!newChildName.trim() || !newChildDob || newChildLearningStyles.length === 0 || newChildLearnsBetterWith.length === 0)
      return

    setIsLoading(true)
    try {
      const response = await apiFetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newChildName,
          date_of_birth: newChildDob,
          gender: newChildGender,
          religion: newChildReligion,
          current_education_level: newChildEducation || null,
          interests: {
            preset: newChildInterestsPreset,
            custom: newChildInterestsCustom || null,
          },
          learning_styles: newChildLearningStyles,
          attention_span: newChildAttentionSpan,
          screen_tolerance: newChildScreenTolerance,
          needs_encouragement: newChildNeedsEncouragement,
          learns_better_with: newChildLearnsBetterWith,
          strengths: newChildStrengths || null,
          challenges: newChildChallenges || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to add child")
      }

      setChildren([...children, data.child])
      if (!selectedChildId) setSelectedChildId(data.child.id)
      setNewChildName("")
      setNewChildDob("")
      setNewChildGender("prefer_not_say")
      setNewChildReligion("muslim")
      setNewChildEducation("")
      setNewChildInterestsPreset([])
      setNewChildInterestsCustom("")
      setNewChildLearningStyles([])
      setNewChildAttentionSpan("medium")
      setNewChildScreenTolerance("medium")
      setNewChildNeedsEncouragement(false)
      setNewChildLearnsBetterWith([])
      setNewChildStrengths("")
      setNewChildChallenges("")
      setIsAddingChild(false)
    } catch (error) {
      console.error("Error adding child:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMultiSelect = <T extends string>(
    list: T[],
    value: T,
    setter: (next: T[]) => void,
  ) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  const handleOrphanSubmit = async () => {
    if (!orphanChildId || !orphanDocFile) return
    setOrphanSubmitting(true)
    setOrphanMessage(null)
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Failed to read document"))
        reader.readAsDataURL(orphanDocFile)
      })

      const response = await apiFetch("/api/orphan/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: orphanChildId,
          documentType: orphanDocType,
          documentName: orphanDocFile.name,
          documentBase64: fileBase64,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Submission failed")
      }
      setOrphanMessage("Document submitted. Awaiting admin review.")
      setOrphanDocFile(null)
      setOrphanDialogOpen(false)
    } catch (error) {
      setOrphanMessage(error instanceof Error ? error.message : "Submission failed")
    } finally {
      setOrphanSubmitting(false)
    }
  }

  const subscriptionStatus = subscription?.status || "none"
  const isTrial = subscription?.type === "trial"
  const isOrphan = subscription?.type === "orphan"
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const trialDaysLeft =
    trialEndsAt && trialEndsAt.getTime() > Date.now()
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0
  const hasActiveSubscription =
    (subscriptionStatus === "active" && subscription?.type === "paid") || (isTrial && trialDaysLeft > 0) || isOrphan

  return (
    <div className="min-h-screen dashboard-parent-bg">
      <Suspense fallback={null}>
        <AssessmentCompleteToast />
      </Suspense>
      <ParentAppHeader active="dashboard" />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-7xl">
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/80 mb-2">Parent dashboard</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-[family-name:var(--font-heading)]">
            Welcome back, {profile?.full_name || "Parent"}
          </h1>
          <p className="text-slate-600 mt-2 max-w-xl leading-relaxed">
            Manage profiles, AI tools, and progress — all in one calm, focused workspace.
          </p>
        </div>

        {hasActiveSubscription ? (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-700 p-[1px] shadow-lg shadow-violet-500/20">
            <div className="rounded-[15px] bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-700 px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {isOrphan
                      ? "Orphan Education Plan"
                      : isTrial
                        ? `Free Trial — ${trialDaysLeft} days left`
                        : `${subscription?.plan_type?.toUpperCase() || "PAID"} Plan`}
                  </p>
                  <p className="text-sm text-violet-100/90">
                    {isOrphan ? "Full access at no cost" : "Full access to all features"}
                  </p>
                </div>
              </div>
              {!isOrphan && (
                <Button size="sm" asChild className="bg-white text-violet-800 hover:bg-violet-50 font-semibold rounded-xl shadow-lg shadow-violet-950/15 border border-white/40">
                  <Link href="/parent/subscription">{isTrial ? "Upgrade Now" : "Manage Plan"}</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-700 p-[1px] shadow-lg shadow-violet-500/20">
            <div className="rounded-[15px] bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-700 px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Start Your Free Trial</p>
                  <p className="text-sm text-violet-100/90">14 days of full access — no card required</p>
                </div>
              </div>
              <Button size="sm" asChild className="bg-white text-violet-800 hover:bg-violet-50 font-semibold rounded-xl shadow-lg shadow-violet-950/15 border border-white/40">
                <Link href="/parent/subscription">Start Trial</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Users, label: "Children", value: children.length, gradient: "from-violet-500 to-indigo-600", iconShadow: "shadow-violet-500/30" },
            { icon: BookOpen, label: "Worksheets Assigned", value: 0, gradient: "from-fuchsia-500 to-rose-500", iconShadow: "shadow-fuchsia-500/30" },
            { icon: TrendingUp, label: "Average Score", value: "0%", gradient: "from-emerald-500 to-teal-600", iconShadow: "shadow-emerald-500/30" },
            { icon: Calendar, label: "This Week", value: 0, gradient: "from-amber-500 to-orange-500", iconShadow: "shadow-amber-500/30" },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="group border border-slate-200/70 bg-white/75 backdrop-blur-sm shadow-[0_8px_30px_-14px_rgba(15,23,42,0.15)] hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.2)] hover:border-violet-200/80 transition-all duration-300 rounded-2xl"
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.iconShadow} ring-1 ring-white/30`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em]">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="children" className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-100/40 backdrop-blur-md p-1.5 shadow-inner">
            <TabsTrigger
              value="children"
              className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-slate-200/80 font-medium text-slate-600"
            >
              Children
            </TabsTrigger>
            <TabsTrigger
              value="ai-tools"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-slate-200/80 font-medium text-slate-600"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Tools
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-slate-200/80 font-medium text-slate-600"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-slate-200/80 font-medium text-slate-600"
            >
              <FileText className="w-3.5 h-3.5" /> Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="children" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Children</h2>
              <Dialog open={isAddingChild} onOpenChange={setIsAddingChild}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-violet-500/25 font-semibold">
                    <Plus className="w-4 h-4 mr-2" /> Add Child
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a New Child</DialogTitle>
                    <DialogDescription>
                      Create a profile for your child to start their learning journey.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="childName">Child&apos;s Name</Label>
                        <Input
                          id="childName"
                          placeholder="Enter name"
                          value={newChildName}
                          onChange={(e) => setNewChildName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="childDob">Date of Birth</Label>
                        <Input
                          id="childDob"
                          type="date"
                          value={newChildDob}
                          onChange={(e) => setNewChildDob(e.target.value)}
                        />
                        {newChildDob && (
                          <p className="text-xs text-teal-600">
                            Age {calculateAgeYears(new Date(newChildDob))}{" "}
                            {deriveAgeGroup(calculateAgeYears(new Date(newChildDob)))
                              ? `• Group ${deriveAgeGroup(calculateAgeYears(new Date(newChildDob)))}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="childGender">Gender</Label>
                        <Select value={newChildGender} onValueChange={(v) => setNewChildGender(v as typeof newChildGender)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="childReligion">Religion</Label>
                        <Select value={newChildReligion} onValueChange={(v) => setNewChildReligion(v as Religion)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {religionOptions.map((religion) => (
                              <SelectItem key={religion} value={religion}>
                                {religion === "muslim" ? "Muslim" : "Non-Muslim"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="childEducation">Current Education Level (optional)</Label>
                      <Input
                        id="childEducation"
                        placeholder="e.g. Kindergarten, Grade 3"
                        value={newChildEducation}
                        onChange={(e) => setNewChildEducation(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Interests</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {interestPresets.map((interest) => (
                          <label key={interest} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={newChildInterestsPreset.includes(interest)}
                              onCheckedChange={() =>
                                toggleMultiSelect(newChildInterestsPreset, interest, setNewChildInterestsPreset)
                              }
                            />
                            {interest}
                          </label>
                        ))}
                      </div>
                      <Input
                        placeholder="Other interest (optional)"
                        value={newChildInterestsCustom}
                        onChange={(e) => setNewChildInterestsCustom(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Learning Style</Label>
                        <div className="space-y-2">
                          {learningStyleOptions.map((style) => (
                            <label key={style} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={newChildLearningStyles.includes(style)}
                                onCheckedChange={() =>
                                  toggleMultiSelect(newChildLearningStyles, style, setNewChildLearningStyles)
                                }
                              />
                              {style.replace("_", "/")}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Attention Span</Label>
                        <Select
                          value={newChildAttentionSpan}
                          onValueChange={(v) => setNewChildAttentionSpan(v as AttentionSpan)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {attentionSpanOptions.map((span) => (
                              <SelectItem key={span} value={span}>
                                {span}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Label className="mt-3">Screen Tolerance</Label>
                        <Select
                          value={newChildScreenTolerance}
                          onValueChange={(v) => setNewChildScreenTolerance(v as ScreenTolerance)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {screenToleranceOptions.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <label className="flex items-center gap-2 text-sm mt-3">
                          <Checkbox
                            checked={newChildNeedsEncouragement}
                            onCheckedChange={(checked) => setNewChildNeedsEncouragement(!!checked)}
                          />
                          Needs encouragement often
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Learns better with</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {learningModeOptions.map((mode) => (
                          <label key={mode} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={newChildLearnsBetterWith.includes(mode)}
                              onCheckedChange={() =>
                                toggleMultiSelect(newChildLearnsBetterWith, mode, setNewChildLearnsBetterWith)
                              }
                            />
                            {mode.replace("_", " ")}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Strengths (optional)</Label>
                        <Textarea
                          value={newChildStrengths}
                          onChange={(e) => setNewChildStrengths(e.target.value)}
                          placeholder="What does the child enjoy most?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Challenges (optional)</Label>
                        <Textarea
                          value={newChildChallenges}
                          onChange={(e) => setNewChildChallenges(e.target.value)}
                          placeholder="What does the child struggle with?"
                        />
                      </div>
                    </div>

                    {newChildDob && (
                      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-700">
                        {calculateAgeYears(new Date(newChildDob)) < 8
                          ? "Electives are locked for children under 8."
                          : "Children ages 8-13 will choose exactly 5 electives during curriculum setup."}
                      </div>
                    )}

                    <Button
                      onClick={handleAddChild}
                      disabled={
                        isLoading ||
                        !newChildName.trim() ||
                        !newChildDob ||
                        newChildLearningStyles.length === 0 ||
                        newChildLearnsBetterWith.length === 0
                      }
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold"
                    >
                      {isLoading ? "Adding..." : "Add Child"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Dialog open={orphanDialogOpen} onOpenChange={setOrphanDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Submit Orphan Verification</DialogTitle>
                  <DialogDescription>Upload official or NGO documentation for review.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select value={orphanDocType} onValueChange={(v) => setOrphanDocType(v as typeof orphanDocType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="death_certificate">Death Certificate</SelectItem>
                        <SelectItem value="ngo_letter">NGO Letter</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Document Upload</Label>
                    <Input
                      ref={orphanInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setOrphanDocFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  {orphanMessage && <p className="text-sm text-teal-600">{orphanMessage}</p>}

                  <Button
                    onClick={handleOrphanSubmit}
                    disabled={!orphanChildId || !orphanDocFile || orphanSubmitting}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold"
                  >
                    {orphanSubmitting ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {children.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {children.map((child) => (
                  <Card
                    key={child.id}
                    className={`border border-slate-200/70 shadow-sm hover:shadow-xl hover:border-violet-200/80 transition-all cursor-pointer rounded-2xl bg-white/90 backdrop-blur-sm group ${
                      selectedChildId === child.id ? "ring-2 ring-violet-500/90 shadow-lg shadow-violet-200/40 border-violet-200/60" : ""
                    }`}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-violet-500/30 ring-2 ring-white/20">
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg tracking-tight">{child.name}</CardTitle>
                          <CardDescription className="text-slate-400 font-medium">Age: {child.age_group} years</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 font-medium">Login Code</span>
                          <code className="rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-xs font-bold text-violet-700 border border-violet-100">
                            {child.login_code}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 font-medium">Assessment</span>
                          {child.assessment_completed ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg text-xs">
                              <Check className="h-3.5 w-3.5" /> Completed
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg text-xs">Pending</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-medium">Progress</span>
                            <span className="font-bold text-slate-700">0%</span>
                          </div>
                          <Progress value={0} className="h-2 rounded-full" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button variant="outline" className="min-w-[130px] flex-1 rounded-xl border-slate-200 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 font-medium" asChild>
                            <Link href={`/parent/child/${child.id}`}>
                              View Details <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                          {child.orphan_status !== "verified" && (
                            <Button
                              variant="outline"
                              className="min-w-[130px] flex-1 rounded-xl border-slate-200 hover:bg-violet-50 hover:border-violet-200 font-medium"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOrphanChildId(child.id)
                                setOrphanDialogOpen(true)
                              }}
                            >
                              <Upload className="w-4 h-4 mr-1" /> Verify Orphan
                            </Button>
                          )}
                          <div className="w-full sm:w-auto">
                            <AssessmentPDFActions
                              child={child}
                              progress={[]}
                              assessments={[]}
                              subjects={subjectsByAgeGroup[child.age_group] ?? []}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-dashed border-slate-300 rounded-2xl bg-white">
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">No children added yet</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    Add your first child to start assigning worksheets and tracking progress.
                  </p>
                  <Button onClick={() => setIsAddingChild(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold shadow-md shadow-violet-500/25">
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Child
                  </Button>
                </CardContent>
              </Card>
            )}

            {selectedChild && selectedChild.assessment_completed && hasActiveSubscription && (
              <div className="mt-6 space-y-6">
                <RoadmapViewer studentId={selectedChild.id} studentName={selectedChild.name} />
                <WeeklyAIInsights studentId={selectedChild.id} studentName={selectedChild.name} />
                <CurriculumPlanCard childId={selectedChild.id} childName={selectedChild.name} />
              </div>
            )}
            {selectedChild && selectedChild.assessment_completed && !hasActiveSubscription && (
              <Card className="mt-6 border border-dashed border-slate-300 rounded-2xl bg-white">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-slate-800">AI roadmap and insights are locked</h3>
                  <p className="mb-5 text-sm text-slate-500 max-w-sm mx-auto">
                    Activate your subscription to view personalized roadmap, weekly AI insights, and curriculum plan.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold shadow-md shadow-violet-500/25">
                    <Link href="/parent/subscription">View Plans</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {selectedChild ? (
              <div className="mt-6">
                {hasActiveSubscription ? (
                  <QuickContentActions
                    childId={selectedChild.id}
                    subjects={selectedChildSubjects}
                    childAgeGroup={selectedChild.age_group}
                  />
                ) : (
                  <Card className="border border-dashed border-slate-300 rounded-2xl bg-white">
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-slate-500">
                        Worksheet, quiz, and story generation for this child is available after subscription activation.
                      </p>
                      <Button asChild className="mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold">
                        <Link href="/parent/subscription">Unlock AI Generation</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="ai-tools" className="space-y-6">
            {!hasActiveSubscription ? (
              <Card className="border border-dashed border-slate-300 rounded-2xl bg-white">
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Subscription required</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    Activate your subscription to access AI tools and personalized content.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold shadow-md shadow-violet-500/25">
                    <Link href="/parent/subscription">View Plans</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : children.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Child Selector */}
                <div className="lg:col-span-2">
                  <Label>Select Child</Label>
                  <Select value={selectedChildId || ""} onValueChange={setSelectedChildId}>
                    <SelectTrigger className="w-full max-w-xs mt-1">
                      <SelectValue placeholder="Select a child" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name} ({child.age_group} years)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base tracking-tight text-slate-800">
                      Curriculum for age {curriculumAgeGroup}
                    </CardTitle>
                    <CardDescription>
                      Subjects and units are loaded from your uploaded curriculum for this child only.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {curriculumLoading ? (
                      <p className="text-sm text-gray-600">Loading curriculum...</p>
                    ) : curriculumSubjects.length > 0 ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {curriculumSubjects.map((subject) => (
                          <div key={subject.id} className="rounded-md border bg-white p-3">
                            <p className="font-medium text-slate-800">{subject.name}</p>
                            <p className="text-xs text-slate-500">
                              {subject.units?.length ?? 0} unit{(subject.units?.length ?? 0) === 1 ? "" : "s"}
                            </p>
                            {subject.units && subject.units.length > 0 ? (
                              <p className="mt-1 text-xs text-slate-600">
                                {subject.units
                                  .slice(0, 2)
                                  .map((unit) => unit.title)
                                  .join(" | ")}
                                {subject.units.length > 2 ? " | ..." : ""}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No curriculum subjects found for this age group yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  <ParentCurriculumImport defaultAgeGroup={curriculumAgeGroup} />
                </div>

                {selectedChildId ? (
                  <div className="lg:col-span-2">
                    <LessonWorksheetAssigner
                      childId={selectedChildId}
                      ageGroup={selectedChild?.age_group ?? curriculumAgeGroup}
                    />
                  </div>
                ) : null}

                {selectedChildId ? (
                  <div className="lg:col-span-2">
                    <QuickContentActions
                      childId={selectedChildId}
                      subjects={selectedChildSubjects}
                      childAgeGroup={selectedChild?.age_group}
                      onWorksheetCreated={() => {
                        // Optional future enhancement: refresh parent-side assignment counters.
                      }}
                      onQuizCreated={() => {
                        // Student will see generated quiz in their dashboard flow.
                      }}
                    />
                  </div>
                ) : null}

                {selectedChildId ? (
                  <div className="lg:col-span-2">
                    <FullLessonGenerator childId={selectedChildId} subjects={selectedChildSubjects} />
                  </div>
                ) : null}

                {/* Worksheet Generator */}
                <WorksheetGenerator
                  subjects={selectedChildSubjects}
                  childId={selectedChildId || undefined}
                  childAgeGroup={selectedChild?.age_group}
                  childLevel={selectedChild?.current_level}
                  onGenerated={(worksheet) => {
                    console.log("Worksheet generated:", worksheet)
                  }}
                />

                {/* AI Recommendations */}
                {selectedChildId && selectedChild && (
                  <RecommendationsPanel childId={selectedChildId} childName={selectedChild.name} />
                )}
              </div>
            ) : (
              <Card className="border border-dashed border-slate-300 rounded-2xl bg-white">
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Add a child first</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    You need to add a child before you can use AI tools to generate personalized content.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ParentOverview childProfiles={children} subjects={allDashboardSubjects} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {hasActiveSubscription ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 tracking-tight">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      Curriculum Guide
                    </CardTitle>
                    <CardDescription>Download the full curriculum for any age group</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CurriculumPDFActions
                      subjects={selectedChildSubjects}
                      ageGroup={curriculumAgeGroup}
                      childName={selectedChild?.name}
                    />
                  </CardContent>
                </Card>

                {/* Assessment Reports */}
                {children.map((child) => (
                  <Card key={child.id} className="border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        {child.name}&apos;s Report
                      </CardTitle>
                      <CardDescription>Assessment results and progress report</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AssessmentPDFActions
                        child={child}
                        progress={[]}
                        assessments={[]}
                        subjects={subjectsByAgeGroup[child.age_group] ?? []}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-dashed border-slate-300 rounded-2xl bg-white">
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Subscription required</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    Documents and reports unlock after you activate a subscription.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl font-semibold shadow-md shadow-violet-500/25">
                    <Link href="/parent/subscription">View Plans</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
