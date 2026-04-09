"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { useOnboarding } from "./onboarding-context"

export function StepPricing() {
  const { state, dispatch } = useOnboarding()
  const router = useRouter()
  const { update } = useSession()
  const [shake, setShake] = useState(false)

  const isFreeEligible =
    state.role === "guardian" && state.fatherStatus === "deceased" && Boolean(state.certificateUrl)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const finish = async (planType: "free" | "trial") => {
    if (!state.userId) {
      router.push("/login")
      return
    }

    dispatch({ type: "MERGE", patch: { uiState: "loading", errorMessage: null } })

    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    try {
      const res = await apiFetch("/api/onboarding/assign-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          planType === "trial"
            ? {
                userId: state.userId,
                planType: "trial",
                trialStart: now.toISOString(),
                trialEnd: trialEnd.toISOString(),
              }
            : { userId: state.userId, planType: "free" },
        ),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        user?: {
          onboardingComplete?: boolean | null
          guardianVerificationStatus?: string
          eligibleForFreeEducation?: boolean
        }
      }

      if (!res.ok) {
        dispatch({
          type: "MERGE",
          patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
        })
        triggerShake()
        return
      }

      await update({
        user: {
          onboardingComplete: data.user?.onboardingComplete ?? true,
          guardianVerificationStatus: data.user?.guardianVerificationStatus,
          eligibleForFreeEducation: data.user?.eligibleForFreeEducation,
        },
      })

      dispatch({ type: "MERGE", patch: { uiState: "idle" } })
      toast.success("Welcome to HomeSchoolar! 🎉")
      router.push("/parent/dashboard")
      router.refresh()
    } catch {
      dispatch({
        type: "MERGE",
        patch: { uiState: "error", errorMessage: "Something went wrong — please try again." },
      })
      triggerShake()
    }
  }

  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 font-[family-name:var(--font-heading)]">
          Choose your plan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Free education unlocked for your child when verified.</p>
      </div>

      {isFreeEligible ? (
        <div className="rounded-2xl border-2 border-[#1D9E75] bg-white p-6 shadow-sm">
          <Badge className="bg-[#1D9E75] text-white hover:bg-[#1D9E75]">Free Education Plan</Badge>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            $0 <span className="text-base font-normal text-muted-foreground">forever</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {["All subjects", "AI worksheets", "Progress reports", "All features"].map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 border border-amber-200">
            Verification pending — full access granted now, plan confirmed upon approval.
          </div>
          <Button
            type="button"
            className="mt-6 w-full rounded-xl bg-[#1D9E75] hover:bg-[#178f6a] text-white"
            disabled={state.uiState === "loading"}
            onClick={() => finish("free")}
          >
            {state.uiState === "loading" ? (
              <>
                <Spinner className="mr-2 text-white" />
                Please wait…
              </>
            ) : (
              "Start Learning Free →"
            )}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div
            className={cn(
              "rounded-2xl border-2 border-[#7F77DD] bg-white p-6 shadow-sm",
              "ring-2 ring-[#EEEDFE]/80",
            )}
          >
            <Badge className="bg-[#7F77DD] text-white hover:bg-[#7F77DD]">Most popular</Badge>
            <p className="mt-4 text-lg font-semibold text-slate-900">14-Day Free Trial</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              $0 <span className="text-base font-normal text-muted-foreground">for 14 days</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {["Full access", "AI learning", "Progress tracking", "No card required"].map((x) => (
                <li key={x}>✓ {x}</li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-6 w-full rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9] text-white"
              disabled={state.uiState === "loading"}
              onClick={() => finish("trial")}
            >
              {state.uiState === "loading" ? (
                <>
                  <Spinner className="mr-2 text-white" />
                  Please wait…
                </>
              ) : (
                "Start Free Trial →"
              )}
            </Button>
          </div>

          <div className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm">
            <p className="font-semibold text-slate-900">Paid plans</p>
            <p className="mt-2 text-sm text-muted-foreground">
              After trial, plans from $22.50/month per child.
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-[#7F77DD]" asChild>
              <Link href="/parent/subscription">View all plans →</Link>
            </Button>
          </div>
        </div>
      )}

      {state.errorMessage && <p className="text-center text-sm text-red-600">{state.errorMessage}</p>}
    </motion.div>
  )
}
