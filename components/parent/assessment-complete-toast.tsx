"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function AssessmentCompleteToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (searchParams.get("assessmentComplete") !== "1") return
    fired.current = true
    const learnerType = searchParams.get("learnerType")?.trim() || "Your learner profile is ready."
    toast.success("Assessment complete", {
      description: learnerType,
      duration: 8000,
    })
    router.replace("/parent")
  }, [searchParams, router])

  return null
}
