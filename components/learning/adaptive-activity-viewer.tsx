"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { LearningBrandHeader } from "@/components/learning/learning-brand-header"
import { Volume2, VolumeX } from "lucide-react"

export type ActivityViewModel = {
  title: string
  objective: string
  materials: string[]
  steps: string[]
  parentTip: string | null
}

export function AdaptiveActivityViewer({ activity }: { activity: ActivityViewModel }) {
  const [speaking, setSpeaking] = useState(false)
  const [canSpeak, setCanSpeak] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speechText = [
    activity.title,
    activity.objective,
    "Materials. " + activity.materials.join(". "),
    "Steps. " + activity.steps.map((s, i) => `Step ${i + 1}. ${s}`).join(". "),
    activity.parentTip ? "Parent tip. " + activity.parentTip : "",
  ]
    .filter(Boolean)
    .join(" ")

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && Boolean(window.speechSynthesis))
  }, [])

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
    utterRef.current = null
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  const readAloud = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    stop()
    const u = new SpeechSynthesisUtterance(speechText)
    u.rate = 0.9
    u.pitch = 1
    u.onend = () => setSpeaking(false)
    utterRef.current = u
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200 bg-gradient-to-b from-white to-violet-50/40 p-4 shadow-sm">
      <LearningBrandHeader />
      <div className="flex flex-wrap justify-end gap-2">
        {canSpeak ? (
          speaking ? (
            <Button type="button" variant="outline" size="sm" onClick={stop}>
              <VolumeX className="mr-2 h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={readAloud}>
              <Volume2 className="mr-2 h-4 w-4" />
              Read aloud
            </Button>
          )
        ) : null}
      </div>
      <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto rounded-xl bg-white/80 p-4 text-left shadow-inner">
        <h4 className="text-center text-xl font-bold text-violet-900 md:text-2xl">{activity.title}</h4>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Objective</p>
          <p className="mt-1 text-slate-800">{activity.objective}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Materials</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-800">
            {activity.materials.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Steps</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-800">
            {activity.steps.map((s, i) => (
              <li key={i} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        </div>
        {activity.parentTip ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Parent tip</p>
            <p className="mt-1 text-sm text-amber-950">{activity.parentTip}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
