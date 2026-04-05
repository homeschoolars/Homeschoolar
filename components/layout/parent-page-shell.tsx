"use client"

import type { ReactNode } from "react"
import { ParentAppHeader, type ParentNavKey } from "@/components/layout/parent-app-header"

export function ParentPageShell({
  title,
  subtitle,
  activeNav,
  children,
}: {
  title: string
  subtitle?: string
  activeNav: ParentNavKey
  children: ReactNode
}) {
  return (
    <div className="min-h-screen dashboard-parent-bg">
      <ParentAppHeader active={activeNav} />

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/80 mb-2">Parent</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-[family-name:var(--font-heading)]">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  )
}
