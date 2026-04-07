"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import type { Child } from "@/lib/types"
import { augmentChildLearningFields } from "@/lib/learning-class"

type GateState = "checking" | "ready" | "locked"

/**
 * Blocks all `/student/*` UI until the parent has completed the holistic learning assessment
 * (`assessment_completed` on the child). Server APIs enforce the same via student session.
 */
export function StudentAssessmentGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<GateState>("checking")
  const [childName, setChildName] = useState<string>("")

  const tryUnlockFromServer = useCallback(async (childId: string) => {
    const res = await apiFetch("/api/student/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean; data?: { child?: Child | null } }
    const nextChild = data.data?.child
    if (nextChild?.assessment_completed) {
      const merged = { ...nextChild, ...augmentChildLearningFields(nextChild) }
      sessionStorage.setItem("student_child", JSON.stringify(merged))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    const raw = sessionStorage.getItem("student_child")
    if (!raw) {
      setState("ready")
      return
    }
    let parsed: Child
    try {
      parsed = JSON.parse(raw) as Child
    } catch {
      setState("ready")
      return
    }
    setChildName(parsed.name ?? "")
    if (parsed.assessment_completed) {
      setState("ready")
      return
    }
    setState("locked")
    void (async () => {
      const unlocked = await tryUnlockFromServer(parsed.id)
      if (unlocked) setState("ready")
    })()
  }, [tryUnlockFromServer])

  const handleRecheck = async () => {
    const raw = sessionStorage.getItem("student_child")
    if (!raw) return
    try {
      const c = JSON.parse(raw) as Child
      const unlocked = await tryUnlockFromServer(c.id)
      if (unlocked) setState("ready")
    } catch {
      /* ignore */
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("student_child")
    router.push("/login")
  }

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50/80 to-white">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      </div>
    )
  }

  if (state === "locked") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-violet-50/80 to-white">
        <Card className="max-w-md w-full border border-violet-200/80 shadow-lg shadow-violet-500/10 rounded-3xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-4xl mb-1" aria-hidden>
              🔒
            </div>
            <h1 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-heading)]">
              Dashboard not open yet
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {childName ? (
                <>
                  Hi <span className="font-semibold text-slate-800">{childName}</span> — your dashboard stays closed until
                  a parent finishes the <span className="font-medium">learning assessment</span> on their account (after
                  you&apos;ve signed in here at least once). The quiz and report are for parents only.
                </>
              ) : (
                <>
                  Your dashboard stays closed until a parent finishes the learning assessment on their account. The quiz
                  and report are for parents only.
                </>
              )}
            </p>
            <p className="text-xs text-slate-500">
              When your parent is done, tap <span className="font-medium text-slate-700">Check again</span> below.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
                type="button"
                onClick={() => void handleRecheck()}
              >
                Check again
              </Button>
              <Button variant="outline" className="rounded-xl" type="button" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
