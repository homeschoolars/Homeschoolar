"use client"

import { useMemo } from "react"
import Image from "next/image"
import { getSiteBranding } from "@/lib/site-branding"

export function LearningBrandHeader({ className = "" }: { className?: string }) {
  const b = useMemo(() => getSiteBranding(), [])
  return (
    <header
      className={`flex flex-col items-center gap-1 rounded-2xl border border-violet-200/80 bg-white/90 px-4 py-3 shadow-sm ${className}`}
    >
      <Image
        src={b.logoSrc}
        alt={`${b.appName} logo`}
        width={140}
        height={48}
        className="h-10 w-auto object-contain"
        priority
      />
      <div className="text-center">
        <p className="text-base font-bold text-violet-900">{b.appName}</p>
        <p className="text-xs text-slate-600">{b.tagline}</p>
      </div>
    </header>
  )
}
