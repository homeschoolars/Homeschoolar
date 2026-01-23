"use client"

import { useState } from "react"
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
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Plus,
  Users,
  Settings,
  LogOut,
  Star,
  Copy,
  Check,
  CreditCard,
  TrendingUp,
  Calendar,
  ChevronRight,
  Sparkles,
  FileText,
  BarChart3,
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
import { WorksheetGenerator } from "@/components/ai/worksheet-generator"
import { RecommendationsPanel } from "@/components/ai/recommendations-panel"
import { CurriculumPDFActions, AssessmentPDFActions } from "@/components/pdf/pdf-actions"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { ParentAnalytics } from "@/components/analytics/parent-analytics"
import { signOut } from "next-auth/react"
import { apiFetch } from "@/lib/api-client"
import {
  attentionSpanOptions,
  interestPresets,
  learningModeOptions,
  learningStyleOptions,
  religionOptions,
  screenToleranceOptions,
} from "@/lib/onboarding-options"
import { calculateAgeYears, deriveAgeGroup } from "@/lib/onboarding-utils"

interface ParentDashboardClientProps {
  profile: Profile | null
  children: Child[]
  subjects: Subject[]
  subscription: Subscription | null
}

export default function ParentDashboardClient({
  profile,
  children: initialChildren,
  subjects,
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    initialChildren.length > 0 ? initialChildren[0].id : null,
  )
  const router = useRouter()

  const selectedChild = children.find((c) => c.id === selectedChildId)
  const curriculumAgeGroup = selectedChild?.age_group ?? "6-7"

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

  const copyLoginCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
    router.push("/login")
  }

  const subscriptionStatus = subscription?.status || "none"
  const trialEndsAt = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HomeSchoolar Logo" width={40} height={40} />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              HomeSchoolar
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/parent" className="text-sm font-medium text-teal-600">
              Dashboard
            </Link>
            <Link href="/parent/worksheets" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Worksheets
            </Link>
            <Link href="/parent/progress" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Progress
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name || "Parent"}!</h1>
          <p className="text-gray-600">Manage your children&apos;s learning journey</p>
        </div>

        {/* Subscription Banner */}
        {subscriptionStatus === "active" || subscription?.plan === "trial" ? (
          <Card className="mb-8 bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6" />
                <div>
                  <p className="font-semibold">
                    {subscription?.plan === "trial"
                      ? `Free Trial - ${Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left`
                      : `${subscription?.plan?.charAt(0).toUpperCase()}${subscription?.plan?.slice(1)} Plan`}
                  </p>
                  <p className="text-sm text-teal-100">Full access to all features</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/parent/subscription">
                  {subscription?.plan === "trial" ? "Upgrade Now" : "Manage Plan"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Start Your Free Trial</p>
                  <p className="text-sm text-amber-100">14 days of full access - no card required</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/parent/subscription">Start Trial</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{children.length}</p>
                  <p className="text-sm text-gray-500">Children</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-500">Worksheets Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0%</p>
                  <p className="text-sm text-gray-500">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-500">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="children" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="ai-tools" className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> AI Tools
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              <FileText className="w-4 h-4" /> Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="children" className="space-y-6">
            {/* Children Section */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Your Children</h2>
              <Dialog open={isAddingChild} onOpenChange={setIsAddingChild}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700">
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
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      {isLoading ? "Adding..." : "Add Child"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {children.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {children.map((child) => (
                  <Card
                    key={child.id}
                    className={`hover:shadow-lg transition-shadow cursor-pointer ${
                      selectedChildId === child.id ? "ring-2 ring-teal-500" : ""
                    }`}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-2xl text-white">
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{child.name}</CardTitle>
                          <CardDescription>Age: {child.age_group} years</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Login Code:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-gray-100 px-2 py-1 rounded font-mono font-bold">
                              {child.login_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyLoginCode(child.login_code)
                              }}
                            >
                              {copiedCode === child.login_code ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Assessment:</span>
                          <span
                            className={`font-medium ${child.assessment_completed ? "text-green-600" : "text-amber-600"}`}
                          >
                            {child.assessment_completed ? "Completed" : "Pending"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">0%</span>
                          </div>
                          <Progress value={0} className="h-2" />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="outline" className="flex-1 bg-transparent" asChild>
                            <Link href={`/parent/child/${child.id}`}>
                              View Details <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                          <AssessmentPDFActions child={child} progress={[]} assessments={[]} subjects={subjects} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No children added yet</h3>
                  <p className="text-gray-500 mb-4">
                    Add your first child to start assigning worksheets and tracking progress.
                  </p>
                  <Button onClick={() => setIsAddingChild(true)} className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Child
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai-tools" className="space-y-6">
            {children.length > 0 ? (
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

                {/* Worksheet Generator */}
                <WorksheetGenerator
                  subjects={subjects}
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
              <Card className="border-dashed border-2">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Add a child first</h3>
                  <p className="text-gray-500">
                    You need to add a child before you can use AI tools to generate personalized content.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ParentAnalytics children={children} subjects={subjects} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Curriculum PDF */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                    Curriculum Guide
                  </CardTitle>
                  <CardDescription>Download the full curriculum for any age group</CardDescription>
                </CardHeader>
                <CardContent>
                  <CurriculumPDFActions
                    subjects={subjects}
                    ageGroup={curriculumAgeGroup}
                    childName={selectedChild?.name}
                  />
                </CardContent>
              </Card>

              {/* Assessment Reports */}
              {children.map((child) => (
                <Card key={child.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      {child.name}&apos;s Report
                    </CardTitle>
                    <CardDescription>Assessment results and progress report</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AssessmentPDFActions child={child} progress={[]} assessments={[]} subjects={subjects} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
