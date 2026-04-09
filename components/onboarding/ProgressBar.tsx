"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
}

export function ProgressBar({ currentStep, totalSteps, stepLabels }: Props) {
  const label = stepLabels[currentStep - 1] ?? ""

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const n = i + 1
          const done = n < currentStep
          const active = n === currentStep
          const isLast = n === totalSteps

          return (
            <div key={n} className="flex flex-1 items-center min-w-0">
              <div
                className={cn(
                  "relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ease-out",
                  done && "bg-[#7F77DD] text-white",
                  active && !done && "bg-[#7F77DD] text-white shadow-[0_0_0_4px_#EEEDFE]",
                  !done && !active && "bg-[#f4f0ff] text-[#7F77DD]/50",
                )}
              >
                {done ? <Check className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.5} /> : n}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1 min-w-[8px] rounded-full transition-colors duration-300",
                    n < currentStep ? "bg-[#7F77DD]" : "bg-[#ede8ff]",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground transition-opacity duration-300">
        Step {currentStep} of {totalSteps}
        {label ? ` — ${label}` : ""}
      </p>
    </div>
  )
}
