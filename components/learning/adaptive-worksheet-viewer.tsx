"use client"

import { useState } from "react"
import { LearningBrandHeader } from "@/components/learning/learning-brand-header"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type WorksheetActivityView =
  | { type: "mcq"; question: string; options: string[]; correctAnswer: string }
  | { type: "short_answer"; question: string; hint: string | null }
  | { type: "fill_in_blank"; prompt: string; answers: string[] }
  | { type: "match"; leftColumn: string[]; rightColumn: string[]; correctPairs: { left: string; right: string }[] }

export type WorksheetViewModel = {
  title: string
  instructions: string
  activities: Array<string | WorksheetActivityView>
}

function FillBlanksInputs({ prompt, answersLength }: { prompt: string; answersLength: number }) {
  const parts = prompt.split(/_{3,}/g)
  const [vals, setVals] = useState<string[]>(() => Array.from({ length: answersLength }, () => ""))

  if (parts.length - 1 !== answersLength) {
    return (
      <p className="text-sm text-slate-700">
        {prompt.replace(/_{3,}/g, "_____")}
      </p>
    )
  }

  return (
    <p className="text-base leading-loose text-slate-800">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < answersLength ? (
            <Input
              className="mx-1 inline-block h-9 w-[7rem] max-w-[40vw] align-middle text-center text-sm"
              value={vals[i] ?? ""}
              onChange={(e) =>
                setVals((prev) => {
                  const next = [...prev]
                  next[i] = e.target.value
                  return next
                })
              }
              aria-label={`Blank ${i + 1}`}
            />
          ) : null}
        </span>
      ))}
    </p>
  )
}

function MatchActivityView({
  leftColumn,
  rightColumn,
}: {
  leftColumn: string[]
  rightColumn: string[]
}) {
  const [choices, setChoices] = useState<Record<string, string>>({})

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">Choose the match for each item on the left.</p>
      <ul className="space-y-3">
        {leftColumn.map((left) => (
          <li key={left} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-800">{left}</p>
            <Select
              value={choices[left] ?? ""}
              onValueChange={(v) => setChoices((c) => ({ ...c, [left]: v }))}
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Pick a match…" />
              </SelectTrigger>
              <SelectContent>
                {rightColumn.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdaptiveWorksheetViewer({ worksheet }: { worksheet: WorksheetViewModel }) {
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({})

  return (
    <div className="space-y-4 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
      <LearningBrandHeader />
      <div className="rounded-xl border border-amber-100 bg-white px-4 py-3">
        <h3 className="text-lg font-bold text-amber-950">{worksheet.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{worksheet.instructions}</p>
      </div>
      <div className="space-y-4">
        {worksheet.activities.map((activity, index) => (
          <section
            key={`act-${index}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            aria-labelledby={`ws-act-${index}`}
          >
            <h4 id={`ws-act-${index}`} className="text-sm font-bold uppercase tracking-wide text-violet-800">
              Section {index + 1}
            </h4>
            {typeof activity === "string" ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{activity}</p>
            ) : activity.type === "mcq" ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-slate-900">{activity.question}</p>
                <RadioGroup
                  value={mcqAnswers[index] ?? ""}
                  onValueChange={(v) => setMcqAnswers((prev) => ({ ...prev, [index]: v }))}
                  className="space-y-2"
                >
                  {activity.options.map((opt) => (
                    <div key={opt} className="flex items-center space-x-2 rounded-lg border border-slate-100 px-2 py-2 hover:bg-slate-50">
                      <RadioGroupItem value={opt} id={`${index}-${opt}`} />
                      <Label htmlFor={`${index}-${opt}`} className="flex-1 cursor-pointer text-sm">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : activity.type === "short_answer" ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-slate-900">{activity.question}</p>
                {activity.hint ? <p className="text-xs text-slate-500">Hint: {activity.hint}</p> : null}
                <Input className="mt-1" placeholder="Your answer" />
              </div>
            ) : activity.type === "fill_in_blank" ? (
              <div className="mt-3">
                <FillBlanksInputs prompt={activity.prompt} answersLength={activity.answers.length} />
              </div>
            ) : activity.type === "match" ? (
              <div className="mt-3">
                <MatchActivityView leftColumn={activity.leftColumn} rightColumn={activity.rightColumn} />
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
