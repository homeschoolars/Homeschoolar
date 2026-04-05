"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { LearningBrandHeader } from "@/components/learning/learning-brand-header"
import { Volume2, VolumeX } from "lucide-react"

export function AdaptiveStoryReader({ story }: { story: string }) {
  const [speaking, setSpeaking] = useState(false)
  const [canSpeak, setCanSpeak] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

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
    const u = new SpeechSynthesisUtterance(story.replace(/\n+/g, ". "))
    u.rate = 0.92
    u.pitch = 1
    u.onend = () => setSpeaking(false)
    utterRef.current = u
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  const paragraphs = story.split(/\n+/).map((p) => p.trim()).filter(Boolean)

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
        {paragraphs.map((p, i) => (
          <p key={i} className="text-lg leading-relaxed text-slate-800 md:text-xl">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
