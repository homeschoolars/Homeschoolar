"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { levelLabelFromAge } from "@/lib/onboarding/level-from-age"
import { getNextStep } from "@/lib/onboarding/step-routing"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { useOnboarding } from "./onboarding-context"

const AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

const INTERESTS = [
  "Reading",
  "Science",
  "Art",
  "Music",
  "Coding",
  "Sports",
  "Math",
  "History",
  "Nature",
  "Technology",
  "Writing",
  "Drama",
] as const

export function StepStudentForm() {
  const { state, dispatch } = useOnboarding()
  const router = useRouter()
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (state.childAge != null) {
      dispatch({ type: "MERGE", patch: { childLevel: levelLabelFromAge(state.childAge) } })
    }
  }, [state.childAge, dispatch])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const toggleInterest = (label: string) => {
    const next = state.interests.includes(label)
      ? state.interests.filter((x) => x !== label)
      : [...state.interests, label]
    dispatch({ type: "SET_FIELD", field: "interests", value: next })
  }

  const onContinue = async () => {
    if (!state.userId) {
      router.push("/login")
      return
    }
    if (!state.childName.trim()) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please enter your child's name." } })
      triggerShake()
      return
    }
    if (state.childAge == null) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please select an age." } })
      triggerShake()
      return
    }

    const isMuslim = state.religion.trim().toLowerCase() === "islam"
    dispatch({ type: "MERGE", patch: { uiState: "loading", errorMessage: null } })

    try {
      const level = levelLabelFromAge(state.childAge)
      const res = await apiFetch("/api/onboarding/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: state.userId,
          name: state.childName.trim(),
          age: state.childAge,
          level,
          goals: state.goals.trim() || null,
          interests: state.interests,
          isMuslim,
        }),
      })
      const data = (await res.json()) as { studentId?: string; error?: string }

      if (!res.ok) {
        dispatch({
          type: "MERGE",
          patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
        })
        triggerShake()
        return
      }

      dispatch({
        type: "MERGE",
        patch: {
          studentId: data.studentId ?? null,
          childLevel: level,
          uiState: "idle",
          step: getNextStep({ ...state, childAge: state.childAge, step: 4 }),
        },
      })
    } catch {
      dispatch({
        type: "MERGE",
        patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
      })
      triggerShake()
    }
  }

  const level =
    state.childAge != null ? levelLabelFromAge(state.childAge) : "Select an age to see level"

  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900 font-[family-name:var(--font-heading)]">
        About your learner
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Almost there!</p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ob-child">Child&apos;s name</Label>
          <Input
            id="ob-child"
            value={state.childName}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "childName", value: e.target.value })}
            className="rounded-xl border-[#ede8ff]"
            placeholder="First name"
          />
        </div>

        <div className="space-y-2">
          <Label>Age</Label>
          <Select
            value={state.childAge != null ? String(state.childAge) : ""}
            onValueChange={(v) => dispatch({ type: "SET_FIELD", field: "childAge", value: Number(v) })}
          >
            <SelectTrigger className="rounded-xl border-[#ede8ff]">
              <SelectValue placeholder="Choose age" />
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

        <div className="rounded-xl bg-[#EEEDFE] px-4 py-3 text-sm text-[#5a5499] border border-[#e0dcfa]">
          Auto-assigned level: <span className="font-semibold">{level}</span> — refined after assessment quiz.
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-goals">Learning goals (optional)</Label>
          <Textarea
            id="ob-goals"
            value={state.goals}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "goals", value: e.target.value })}
            className="rounded-xl border-[#ede8ff] min-h-[88px]"
            placeholder="What would you like them to focus on?"
          />
        </div>

        <div className="space-y-2">
          <Label>Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((label) => {
              const on = state.interests.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleInterest(label)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    on
                      ? "border-[#7F77DD] bg-[#7F77DD] text-white"
                      : "border-[#ede8ff] bg-white text-[#7F77DD] hover:bg-[#faf8ff]",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {state.errorMessage && <p className="mt-4 text-sm text-red-600">{state.errorMessage}</p>}

      <Button
        type="button"
        className="mt-6 w-full rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9] text-white"
        disabled={state.uiState === "loading"}
        onClick={onContinue}
      >
        {state.uiState === "loading" ? (
          <>
            <Spinner className="mr-2 text-white" />
            Please wait…
          </>
        ) : (
          "Continue →"
        )}
      </Button>
    </motion.div>
  )
}
