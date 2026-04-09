export type OnboardingState = {
  step: number
  uiState: "idle" | "loading" | "uploading" | "generating" | "success" | "error"
  errorMessage: string | null

  name: string
  email: string
  password: string
  phone: string
  country: string
  religion: string
  role: "parent" | "guardian" | null

  fatherStatus: "alive" | "deceased" | null

  certificateFile: File | null
  certificateUrl: string | null
  uploadProgress: number
  uploadRetries: number

  childName: string
  childAge: number | null
  childLevel: string
  goals: string
  interests: string[]

  eligibleForFree: boolean
  userId: string | null
  studentId: string | null
}

export const initialState: OnboardingState = {
  step: 1,
  uiState: "idle",
  errorMessage: null,
  name: "",
  email: "",
  password: "",
  phone: "",
  country: "",
  religion: "",
  role: null,
  fatherStatus: null,
  certificateFile: null,
  certificateUrl: null,
  uploadProgress: 0,
  uploadRetries: 0,
  childName: "",
  childAge: null,
  childLevel: "",
  goals: "",
  interests: [],
  eligibleForFree: false,
  userId: null,
  studentId: null,
}

export type OnboardingAction =
  | { type: "SET_FIELD"; field: keyof OnboardingState; value: unknown }
  | { type: "SET_STEP"; step: number }
  | { type: "RESET_CERTIFICATE" }
  | { type: "MERGE"; patch: Partial<OnboardingState> }
  | { type: "INCREMENT_UPLOAD_RETRY" }
