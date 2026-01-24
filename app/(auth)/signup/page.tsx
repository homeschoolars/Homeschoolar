"use client"

import type React from "react"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Sparkles, Star, UserPlus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/api-client"
import {
  attentionSpanOptions,
  interestPresets,
  learningModeOptions,
  learningStyleOptions,
  parentRelationships,
  religionOptions,
  screenToleranceOptions,
} from "@/lib/onboarding-options"
import { calculateAgeYears, deriveAgeGroup } from "@/lib/onboarding-utils"
import type { AttentionSpan, LearningMode, LearningStyle, ParentRelationship, Religion, ScreenTolerance } from "@/lib/types"

type ParentForm = {
  fullName: string
  relationship: ParentRelationship
  email: string
  phone: string
  country: string
  timezone: string
  password: string
  confirmPassword: string
}

type ChildForm = {
  fullName: string
  dateOfBirth: string
  gender: "male" | "female" | "other" | "prefer_not_say"
  religion: Religion
  currentEducationLevel: string
  interestsPreset: string[]
  interestsCustom: string
  learningStyles: LearningStyle[]
  attentionSpan: AttentionSpan
  screenTolerance: ScreenTolerance
  needsEncouragement: boolean
  learnsBetterWith: LearningMode[]
  strengths: string
  challenges: string
}

type ChildArrayKey = "interestsPreset" | "learningStyles" | "learnsBetterWith"

const defaultParent: ParentForm = {
  fullName: "",
  relationship: "guardian",
  email: "",
  phone: "",
  country: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  password: "",
  confirmPassword: "",
}

const defaultChild: ChildForm = {
  fullName: "",
  dateOfBirth: "",
  gender: "prefer_not_say",
  religion: "muslim",
  currentEducationLevel: "",
  interestsPreset: [],
  interestsCustom: "",
  learningStyles: [],
  attentionSpan: "medium",
  screenTolerance: "medium",
  needsEncouragement: false,
  learnsBetterWith: [],
  strengths: "",
  challenges: "",
}

export default function SignupPage() {
  const [step, setStep] = useState(0)
  const [parent, setParent] = useState<ParentForm>(defaultParent)
  const [children, setChildren] = useState<ChildForm[]>([{ ...defaultChild }])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const canContinueParent = useMemo(() => {
    return (
      parent.fullName.trim() &&
      parent.relationship &&
      parent.email.trim() &&
      parent.country.trim() &&
      parent.timezone.trim() &&
      parent.password.length >= 6 &&
      parent.password === parent.confirmPassword
    )
  }, [parent])

  const handleAddChild = () => {
    setChildren((prev) => [...prev, { ...defaultChild }])
  }

  const handleRemoveChild = (index: number) => {
    setChildren((prev) => prev.filter((_, idx) => idx !== index))
  }

  const updateChild = (index: number, updates: Partial<ChildForm>) => {
    setChildren((prev) => prev.map((child, idx) => (idx === index ? { ...child, ...updates } : child)))
  }

  const toggleChildMultiSelect = <K extends ChildArrayKey>(
    index: number,
    key: K,
    value: ChildForm[K][number],
  ) => {
    const current = children[index][key] as ChildForm[K]
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    updateChild(index, { [key]: next } as Pick<ChildForm, K>)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!canContinueParent) {
      setError("Please complete all parent details.")
      return
    }

    if (children.some((child) => !child.fullName.trim() || !child.dateOfBirth)) {
      setError("Each child must have a full name and date of birth.")
      return
    }

    if (children.some((child) => child.learningStyles.length === 0 || child.learnsBetterWith.length === 0)) {
      setError("Please select learning styles and learning preferences for each child.")
      return
    }

    setIsLoading(true)
    try {
      const response = await apiFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: {
            full_name: parent.fullName,
            relationship: parent.relationship,
            email: parent.email,
            phone: parent.phone || null,
            country: parent.country,
            timezone: parent.timezone,
            password: parent.password,
          },
          children: children.map((child) => ({
            full_name: child.fullName,
            date_of_birth: child.dateOfBirth,
            gender: child.gender,
            religion: child.religion,
            current_education_level: child.currentEducationLevel || null,
            interests: {
              preset: child.interestsPreset,
              custom: child.interestsCustom || null,
            },
            learning_styles: child.learningStyles,
            attention_span: child.attentionSpan,
            screen_tolerance: child.screenTolerance,
            needs_encouragement: child.needsEncouragement,
            learns_better_with: child.learnsBetterWith,
            strengths: child.strengths || null,
            challenges: child.challenges || null,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      await signIn("credentials", {
        email: parent.email,
        password: parent.password,
        redirect: false,
      })
      router.push("/signup/success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-400 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 w-6 h-6 text-pink-400 animate-bounce" />
        <Star className="absolute bottom-40 left-20 w-6 h-6 text-purple-400 animate-pulse" />
      </div>

      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="HomeSchoolar Logo"
              width={80}
              height={80}
              className="group-hover:scale-105 transition-transform animate-float"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              HomeSchoolar
            </span>
          </Link>
        </div>

        <Card className="border-2 border-purple-200 shadow-xl bg-white/80 backdrop-blur animate-pop-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Create Your Family Account
            </CardTitle>
            <CardDescription>Tell us about your family so we can personalize learning.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-center gap-3 text-sm font-semibold text-purple-600">
                <span className={step === 0 ? "text-purple-700" : "text-purple-400"}>Parent Details</span>
                <ChevronRight className="h-4 w-4" />
                <span className={step === 1 ? "text-purple-700" : "text-purple-400"}>Children Profiles</span>
              </div>

              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentName">Full Name</Label>
                      <Input
                        id="parentName"
                        value={parent.fullName}
                        onChange={(e) => setParent((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Parent or guardian name"
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <select
                        id="relationship"
                        value={parent.relationship}
                        onChange={(e) =>
                          setParent((prev) => ({ ...prev, relationship: e.target.value as ParentRelationship }))
                        }
                        className="w-full rounded-md border-2 border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400"
                      >
                        {parentRelationships.map((relationship) => (
                          <option key={relationship} value={relationship}>
                            {relationship.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">Email</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={parent.email}
                        onChange={(e) => setParent((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="parent@example.com"
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Phone (optional)</Label>
                      <Input
                        id="parentPhone"
                        value={parent.phone}
                        onChange={(e) => setParent((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 555 123 4567"
                        className="border-2 border-purple-200 focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentCountry">Country</Label>
                      <Input
                        id="parentCountry"
                        value={parent.country}
                        onChange={(e) => setParent((prev) => ({ ...prev, country: e.target.value }))}
                        placeholder="Country"
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentTimezone">Timezone</Label>
                      <Input
                        id="parentTimezone"
                        value={parent.timezone}
                        onChange={(e) => setParent((prev) => ({ ...prev, timezone: e.target.value }))}
                        placeholder="Timezone"
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentPassword">Password</Label>
                      <Input
                        id="parentPassword"
                        type="password"
                        value={parent.password}
                        onChange={(e) => setParent((prev) => ({ ...prev, password: e.target.value }))}
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentConfirmPassword">Confirm Password</Label>
                      <Input
                        id="parentConfirmPassword"
                        type="password"
                        value={parent.confirmPassword}
                        onChange={(e) => setParent((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={!canContinueParent}
                      className="bg-gradient-to-r from-purple via-pink to-orange text-white font-semibold"
                    >
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  {children.map((child, index) => {
                    const ageYears = child.dateOfBirth
                      ? calculateAgeYears(new Date(child.dateOfBirth))
                      : null
                    const ageGroup = ageYears !== null ? deriveAgeGroup(ageYears) : null

                    return (
                      <Card key={index} className="border border-purple-100 bg-white/70">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-purple-500" />
                            Child {index + 1}
                          </CardTitle>
                          {children.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleRemoveChild(index)}
                              className="text-sm text-red-500 hover:text-red-600"
                            >
                              Remove
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Full Name</Label>
                              <Input
                                value={child.fullName}
                                onChange={(e) => updateChild(index, { fullName: e.target.value })}
                                placeholder="Child's full name"
                                className="border-2 border-purple-200 focus:border-purple-400"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Date of Birth</Label>
                              <Input
                                type="date"
                                value={child.dateOfBirth}
                                onChange={(e) => updateChild(index, { dateOfBirth: e.target.value })}
                                className="border-2 border-purple-200 focus:border-purple-400"
                                required
                              />
                              {ageYears !== null && (
                                <p className="text-xs text-purple-600">
                                  Age {ageYears} {ageGroup ? `• Group ${ageGroup}` : ""}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Gender</Label>
                              <select
                                value={child.gender}
                                onChange={(e) =>
                                  updateChild(index, {
                                    gender: e.target.value as ChildForm["gender"],
                                  })
                                }
                                className="w-full rounded-md border-2 border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400"
                              >
                                <option value="prefer_not_say">Prefer not to say</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Religion</Label>
                              <select
                                value={child.religion}
                                onChange={(e) =>
                                  updateChild(index, {
                                    religion: e.target.value as Religion,
                                  })
                                }
                                className="w-full rounded-md border-2 border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400"
                              >
                                {religionOptions.map((religion) => (
                                  <option key={religion} value={religion}>
                                    {religion === "muslim" ? "Muslim" : "Non-Muslim"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Current Education Level (optional)</Label>
                            <Input
                              value={child.currentEducationLevel}
                              onChange={(e) => updateChild(index, { currentEducationLevel: e.target.value })}
                              placeholder="e.g. Kindergarten, Grade 3"
                              className="border-2 border-purple-200 focus:border-purple-400"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Interests</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {interestPresets.map((interest) => (
                                <label key={interest} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={child.interestsPreset.includes(interest)}
                                    onCheckedChange={() => toggleChildMultiSelect(index, "interestsPreset", interest)}
                                  />
                                  {interest}
                                </label>
                              ))}
                            </div>
                            <Input
                              value={child.interestsCustom}
                              onChange={(e) => updateChild(index, { interestsCustom: e.target.value })}
                              placeholder="Other interest (optional)"
                              className="border-2 border-purple-200 focus:border-purple-400"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Learning Style</Label>
                              <div className="space-y-2">
                                {learningStyleOptions.map((style) => (
                                  <label key={style} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={child.learningStyles.includes(style)}
                                      onCheckedChange={() => toggleChildMultiSelect(index, "learningStyles", style)}
                                    />
                                    {style.replace("_", "/")}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Attention Span</Label>
                              <select
                                value={child.attentionSpan}
                                onChange={(e) =>
                                  updateChild(index, { attentionSpan: e.target.value as AttentionSpan })
                                }
                                className="w-full rounded-md border-2 border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400"
                              >
                                {attentionSpanOptions.map((span) => (
                                  <option key={span} value={span}>
                                    {span}
                                  </option>
                                ))}
                              </select>
                              <Label className="mt-4">Screen Tolerance</Label>
                              <select
                                value={child.screenTolerance}
                                onChange={(e) =>
                                  updateChild(index, { screenTolerance: e.target.value as ScreenTolerance })
                                }
                                className="w-full rounded-md border-2 border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400"
                              >
                                {screenToleranceOptions.map((level) => (
                                  <option key={level} value={level}>
                                    {level}
                                  </option>
                                ))}
                              </select>
                              <label className="flex items-center gap-2 text-sm mt-3">
                                <Checkbox
                                  checked={child.needsEncouragement}
                                  onCheckedChange={(checked) => updateChild(index, { needsEncouragement: !!checked })}
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
                                    checked={child.learnsBetterWith.includes(mode)}
                                    onCheckedChange={() => toggleChildMultiSelect(index, "learnsBetterWith", mode)}
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
                                value={child.strengths}
                                onChange={(e) => updateChild(index, { strengths: e.target.value })}
                                placeholder="What does the child enjoy most?"
                                className="border-2 border-purple-200 focus:border-purple-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Challenges (optional)</Label>
                              <Textarea
                                value={child.challenges}
                                onChange={(e) => updateChild(index, { challenges: e.target.value })}
                                placeholder="What does the child struggle with?"
                                className="border-2 border-purple-200 focus:border-purple-400"
                              />
                            </div>
                          </div>

                          {ageYears !== null && (
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
                              {ageYears < 8
                                ? "Electives are locked for children under 8."
                                : "Children ages 8-13 will choose exactly 5 electives during curriculum setup."}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}

                  <Button type="button" variant="outline" onClick={handleAddChild} className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" /> Add another child
                  </Button>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-semibold"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⭐</span> Creating Account...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Start Free Trial
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">{error}</div>
              )}

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium underline">
                  Log in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
