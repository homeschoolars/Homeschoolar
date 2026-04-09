"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPrevStep, getProgressLabels, getProgressPosition } from "@/lib/onboarding/step-routing"
import { useOnboarding } from "./onboarding-context"
import { ProgressBar } from "./ProgressBar"
import { StepRegistration } from "./StepRegistration"
import { StepFatherStatus } from "./StepFatherStatus"
import { StepVerification } from "./StepVerification"
import { StepStudentForm } from "./StepStudentForm"
import { StepPricing } from "./StepPricing"

const motionProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" as const },
}

export function OnboardingShell() {
  const { state, dispatch } = useOnboarding()
  const { current, total } = getProgressPosition(state)
  const labels = getProgressLabels(state)

  const showBack = state.step > 1

  const goBack = () => {
    const prev = getPrevStep(state)
    dispatch({ type: "SET_STEP", step: prev })
    dispatch({ type: "MERGE", patch: { uiState: "idle", errorMessage: null } })
  }

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <StepRegistration key="s1" />
      case 2:
        return <StepFatherStatus key="s2" />
      case 3:
        return <StepVerification key="s3" />
      case 4:
        return <StepStudentForm key="s4" />
      case 5:
        return <StepPricing key="s5" />
      default:
        return <StepRegistration key="s0" />
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image
          src="/homeschoolars-logo-v2.png"
          alt="HomeSchoolar"
          width={180}
          height={48}
          className="h-10 w-auto object-contain"
          priority
        />
        <ProgressBar currentStep={current} totalSteps={total} stepLabels={labels} />
      </div>

      {showBack && (
        <Button
          type="button"
          variant="ghost"
          className="mb-4 -ml-2 w-fit gap-1 text-[#7F77DD] hover:text-[#6a63c4]"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={state.step} {...motionProps} className="flex-1">
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
