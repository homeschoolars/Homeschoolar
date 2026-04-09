import type { OnboardingState } from "./types"

export function getNextStep(state: OnboardingState): number {
  if (state.step === 1) {
    return state.role === "parent" ? 4 : 2
  }
  if (state.step === 2) {
    return state.fatherStatus === "deceased" ? 3 : 4
  }
  if (state.step === 3) return 4
  if (state.step === 4) return 5
  return 5
}

export function getPrevStep(state: OnboardingState): number {
  if (state.step === 4) {
    if (state.role === "parent") return 1
    if (state.fatherStatus === "deceased") return 3
    return 2
  }
  if (state.step === 3) return 2
  if (state.step === 2) return 1
  if (state.step === 5) return 4
  return 1
}

export function getTotalSteps(state: OnboardingState): number {
  if (state.role === "guardian" && state.fatherStatus === "deceased") return 5
  if (state.role === "guardian") return 4
  return 3
}

export function getProgressLabels(state: OnboardingState): string[] {
  if (state.role === "parent") return ["Account", "Student", "Plan"]
  if (state.role === "guardian" && state.fatherStatus === "deceased") {
    return ["Account", "Family", "Verify", "Student", "Plan"]
  }
  if (state.role === "guardian") return ["Account", "Family", "Student", "Plan"]
  return ["Account", "Student", "Plan"]
}

/** Maps internal `state.step` to progress bar position (1..total). */
export function getProgressPosition(state: OnboardingState): { current: number; total: number } {
  if (state.role === "parent") {
    const m: Record<number, number> = { 1: 1, 4: 2, 5: 3 }
    return { current: m[state.step] ?? 1, total: 3 }
  }
  if (state.role === "guardian" && state.fatherStatus === "deceased") {
    return { current: state.step, total: 5 }
  }
  if (state.role === "guardian") {
    const m: Record<number, number> = { 1: 1, 2: 2, 4: 3, 5: 4 }
    return { current: m[state.step] ?? 1, total: 4 }
  }
  return { current: 1, total: 3 }
}
