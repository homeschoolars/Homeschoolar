import type { OnboardingState } from "./types"

export const ONBOARDING_STORAGE_PREFIX = "homeschoolars-onboarding-v1"

export function onboardingStorageKey(email: string) {
  return `${ONBOARDING_STORAGE_PREFIX}:${email.trim().toLowerCase()}`
}

/** Persist draft without password or file handles. */
export function serializeOnboardingDraft(state: OnboardingState): string {
  const { certificateFile: _f, password: _p, ...rest } = state
  return JSON.stringify(rest)
}

export function parseOnboardingDraft(raw: string): Partial<OnboardingState> | null {
  try {
    const o = JSON.parse(raw) as Partial<OnboardingState>
    return {
      ...o,
      certificateFile: null,
      password: "",
      uiState: "idle",
      errorMessage: null,
    }
  } catch {
    return null
  }
}
