"use client"

import { cn } from "@/lib/utils"
import type { AnswerValue, BankQuestion } from "@/lib/assessment/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function QuizQuestion({
  question,
  value,
  onChange,
  parentMode,
  error,
}: {
  question: BankQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  parentMode: boolean
  error?: string | null
}) {
  const opts = question.options ?? []

  if (question.type === "mcq" || question.type === "observe") {
    return (
      <div className="space-y-4">
        {parentMode && question.type === "observe" ? (
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
            Parent observation: choose the option that best matches what you see at home.
          </p>
        ) : null}
        <p className="text-lg font-semibold leading-snug text-slate-900">{question.question}</p>
        <ul className="space-y-2">
          {opts.map((opt, i) => {
            const selected =
              value?.type === question.type && "selectedIndex" in value && value.selectedIndex === i
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      question.type === "mcq"
                        ? { type: "mcq", selectedIndex: i }
                        : { type: "observe", selectedIndex: i },
                    )
                  }
                  className={cn(
                    "w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors",
                    selected
                      ? "border-violet-600 bg-violet-50 text-violet-950"
                      : "border-slate-200 bg-white hover:border-violet-300",
                  )}
                >
                  <span className="mr-2 font-bold text-violet-600">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              </li>
            )
          })}
        </ul>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    )
  }

  if (question.type === "scale") {
    const v = value?.type === "scale" ? value.value : undefined
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold leading-snug text-slate-900">{question.question}</p>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>{question.minLabel ?? "Low"}</span>
          <span>{question.maxLabel ?? "High"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ type: "scale", value: n })}
              className={cn(
                "h-12 w-12 rounded-xl border-2 text-base font-bold transition-colors",
                v === n ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white hover:border-violet-300",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    )
  }

  const text = value?.type === "open" ? value.text : ""
  const min = question.minLength ?? 20
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-slate-900">{question.question}</p>
      <div className="space-y-2">
        <Label htmlFor="open-ans">Your answer</Label>
        <Textarea
          id="open-ans"
          rows={5}
          value={text}
          onChange={(e) => onChange({ type: "open", text: e.target.value })}
          placeholder={`At least ${min} characters…`}
          className="resize-y"
        />
        <p className="text-xs text-slate-500">
          {text.trim().length}/{min} characters minimum
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
