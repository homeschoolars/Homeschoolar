"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react"
import type { OnboardingAction, OnboardingState } from "@/lib/onboarding/types"
import { initialState } from "@/lib/onboarding/types"
import { onboardingStorageKey, parseOnboardingDraft, serializeOnboardingDraft } from "@/lib/onboarding/persist"

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value } as OnboardingState
    case "SET_STEP":
      return { ...state, step: action.step }
    case "RESET_CERTIFICATE":
      return {
        ...state,
        certificateFile: null,
        certificateUrl: null,
        uploadProgress: 0,
        uploadRetries: 0,
      }
    case "MERGE":
      return { ...state, ...action.patch }
    case "INCREMENT_UPLOAD_RETRY":
      return { ...state, uploadRetries: state.uploadRetries + 1 }
    default:
      return state
  }
}

type Ctx = {
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
  tryLoadDraftForEmail: (email: string) => boolean
}

const OnboardingContext = createContext<Ctx | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!state.email.trim()) return
    try {
      localStorage.setItem(onboardingStorageKey(state.email), serializeOnboardingDraft(state))
    } catch {
      /* ignore quota */
    }
  }, [state])

  const tryLoadDraftForEmail = useCallback((email: string) => {
    try {
      const raw = localStorage.getItem(onboardingStorageKey(email))
      if (!raw) return false
      const patch = parseOnboardingDraft(raw)
      if (!patch) return false
      dispatch({ type: "MERGE", patch })
      return true
    } catch {
      return false
    }
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, tryLoadDraftForEmail }),
    [state, tryLoadDraftForEmail],
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider")
  return ctx
}
