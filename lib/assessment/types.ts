export type QuestionType = "mcq" | "observe" | "scale" | "open"

export type BankQuestion = {
  id: string
  type: QuestionType
  subject: string
  subjectLabel: string
  question: string
  options?: string[]
  /** For mcq: index of correct option */
  correctIndex?: number
  /** For observe: weight per option (same length as options) */
  weights?: number[]
  minLabel?: string
  maxLabel?: string
  /** Minimum chars for open-ended */
  minLength?: number
}

export type AnswerValue =
  | { type: "mcq"; selectedIndex: number }
  | { type: "observe"; selectedIndex: number }
  | { type: "scale"; value: number }
  | { type: "open"; text: string }

export type SubjectScore = { pct: number; total: number; max: number }
