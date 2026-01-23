"use client"

import { useEffect, useRef } from "react"

interface AnimatedBackgroundProps {
  className?: string
}

export function AnimatedBackground({ className = "" }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    let rafId = 0
    const handleMove = (event: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        container.style.setProperty("--bg-x", `${Math.round(x * 100)}%`)
        container.style.setProperty("--bg-y", `${Math.round(y * 100)}%`)
      })
    }

    container.addEventListener("pointermove", handleMove)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      container.removeEventListener("pointermove", handleMove)
    }
  }, [])

  return (
    <div ref={containerRef} className={`animated-bg ${className}`} aria-hidden="true">
      <div className="animated-bg__gradient" />
      <div className="animated-bg__glow animated-bg__glow--one" />
      <div className="animated-bg__glow animated-bg__glow--two" />
      <div className="animated-bg__glow animated-bg__glow--three" />
      <div className="animated-bg__sparkle animated-bg__sparkle--one" />
      <div className="animated-bg__sparkle animated-bg__sparkle--two" />
      <div className="animated-bg__sparkle animated-bg__sparkle--three" />
    </div>
  )
}
