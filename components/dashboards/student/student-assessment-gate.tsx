"use client"

import { useCallback, useEffect, startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import type { Child } from "@/lib/types"
import { augmentChildLearningFields } from "@/lib/learning-class"
import { ParentGateScreen } from "@/components/assessment/ParentGateScreen"
import { AssessmentQuiz } from "@/components/assessment/AssessmentQuiz"

type CheckResult = {
  hasAssessment: boolean
  isParentMode: boolean
  ageYears?: number
}

type Flow = "boot" | "assessment" | "ready"

/**
 * Student-first holistic assessment: age ≤6 uses parent gate + shared quiz; age ≥7 takes quiz directly.
 * One active AI quiz per child (server enforces reuse of in-progress session).
 */
export function StudentAssessmentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [flow, setFlow] = useState<Flow>("boot")
  const [child, setChild] = useState<Child | null>(null)
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [parentGateDone, setParentGateDone] = useState(false)

  const refreshChildFromServer = useCallback(async (childId: string) => {
    const res = await apiFetch("/api/student/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
      credentials: "include",
    })
    if (!res.ok) return
    const data = (await res.json()) as { data?: { child?: Child | null } }
    const nextChild = data.data?.child
    if (!nextChild) return
    const merged = { ...nextChild, ...augmentChildLearningFields(nextChild) }
    sessionStorage.setItem("student_child", JSON.stringify(merged))
    setChild(merged)
    if (nextChild.assessment_completed) setFlow("ready")
  }, [])

  useEffect(() => {
    startTransition(() => {
      const raw = sessionStorage.getItem("student_child")
      if (!raw) {
        setFlow("ready")
        return
      }
      let parsed: Child
      try {
        parsed = JSON.parse(raw) as Child
      } catch {
        setFlow("ready")
        return
      }
      const merged = { ...parsed, ...augmentChildLearningFields(parsed) }
      setChild(merged)

      if (merged.assessment_completed) {
        setFlow("ready")
        return
      }

      void (async () => {
        try {
          const res = await apiFetch("/api/assessment/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check", childId: merged.id }),
            credentials: "include",
          })
          const data = (await res.json()) as CheckResult & { error?: string }
          if (!res.ok) {
            setFlow("ready")
            return
          }
          if (data.hasAssessment) {
            await refreshChildFromServer(merged.id)
            setFlow("ready")
            return
          }
          setCheck(data)
          setFlow("assessment")
        } catch {
          setFlow("ready")
        }
      })()
    })
  }, [refreshChildFromServer])

  const handleAssessmentComplete = useCallback(() => {
    if (!child) return
    void refreshChildFromServer(child.id).then(() => {
      setFlow("ready")
      router.refresh()
    })
  }, [child, refreshChildFromServer, router])

  if (flow === "boot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6ff]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#7F77DD] mx-auto mb-3" />
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      </div>
    )
  }

  if (flow === "assessment" && child && check && !check.hasAssessment) {
    const needGate = check.isParentMode && !parentGateDone
    if (needGate) {
      return (
        <ParentGateScreen
          childId={child.id}
          childName={child.name}
          onVerified={() => setParentGateDone(true)}
        />
      )
    }
    return (
      <AssessmentQuiz
        childId={child.id}
        parentObservationMode={check.isParentMode}
        onComplete={handleAssessmentComplete}
      />
    )
  }

  return <>{children}</>
}
