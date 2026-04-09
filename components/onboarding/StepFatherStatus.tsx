"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bird, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"
import { getNextStep } from "@/lib/onboarding/step-routing"
import { cn } from "@/lib/utils"
import { useOnboarding } from "./onboarding-context"

export function StepFatherStatus() {
  const { state, dispatch } = useOnboarding()
  const [shake, setShake] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const selectStatus = async (next: "alive" | "deceased") => {
    const prev = state.fatherStatus
    if (prev === "deceased" && next === "alive") {
      try {
        await apiFetch("/api/onboarding/update-family", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fatherStatus: "alive" }),
        })
      } catch {
        /* still reset UI */
      }
      dispatch({ type: "RESET_CERTIFICATE" })
    }
    dispatch({ type: "SET_FIELD", field: "fatherStatus", value: next })
  }

  const onContinue = async () => {
    if (!state.fatherStatus) {
      dispatch({ type: "MERGE", patch: { errorMessage: "Please select an option." } })
      triggerShake()
      return
    }
    dispatch({ type: "MERGE", patch: { uiState: "loading", errorMessage: null } })
    try {
      await apiFetch("/api/onboarding/update-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fatherStatus: state.fatherStatus }),
      })
      const next = getNextStep(state)
      dispatch({ type: "MERGE", patch: { step: next, uiState: "idle" } })
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
      className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900 font-[family-name:var(--font-heading)]">
        A little more about your family
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">This helps us support families who need it most.</p>

      <div className="mt-4 rounded-xl bg-[#EEEDFE] px-4 py-3 text-sm text-[#5a5499] border border-[#e0dcfa]">
        Orphaned children may qualify for completely free education.
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => selectStatus("alive")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-colors",
            state.fatherStatus === "alive"
              ? "border-[#1D9E75] bg-[#EAF3DE]"
              : "border-[#ede8ff] bg-white hover:border-[#c8e8d4]",
          )}
        >
          <Heart className="h-6 w-6 text-[#1D9E75]" />
          <span className="font-semibold text-slate-900">Father is alive</span>
        </button>
        <button
          type="button"
          onClick={() => selectStatus("deceased")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-colors",
            state.fatherStatus === "deceased"
              ? "border-[#E24B4A] bg-[#FCEBEB]"
              : "border-[#ede8ff] bg-white hover:border-[#f0c4c4]",
          )}
        >
          <Bird className="h-6 w-6 text-[#E24B4A]" />
          <span className="font-semibold text-slate-900">Father has passed away</span>
        </button>
      </div>

      {state.errorMessage && <p className="mt-3 text-sm text-red-600">{state.errorMessage}</p>}

      <Button
        type="button"
        className="mt-6 w-full rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9] text-white"
        disabled={state.uiState === "loading"}
        onClick={onContinue}
      >
        {state.uiState === "loading" ? "Please wait…" : "Continue →"}
      </Button>
    </motion.div>
  )
}
