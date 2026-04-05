"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Star, Coins, Flame, LogOut } from "lucide-react"
import type { Child } from "@/lib/types"

const XP_PER_LEVEL = 100

interface GamifiedHeaderProps {
  child: Child
  stars: number
  level: number
  coins: number
  streak: number
  xpInLevel?: number
  xpToNextLevel?: number
}

export function GamifiedHeader({
  child,
  stars,
  level,
  coins,
  streak,
  xpInLevel = 0,
  xpToNextLevel = XP_PER_LEVEL,
}: GamifiedHeaderProps) {
  const levelProgress = Math.min(1, xpInLevel / XP_PER_LEVEL)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.1)]">
      <span className="sr-only">Logged in as {child.name}</span>
      <div className="container mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0 group">
          <Image
            src="/homeschoolars-logo-v2.png"
            alt="HomeSchoolar"
            width={36}
            height={36}
            className="rounded-xl ring-1 ring-slate-200/80 group-hover:ring-violet-200 transition-all"
          />
          <span className="text-base font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent hidden sm:inline tracking-tight">
            HomeSchoolar
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1.5 border transition-all ${
              streak > 0
                ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200/90 shadow-sm shadow-orange-500/10"
                : "bg-slate-50 border-slate-200/80"
            }`}
          >
            <Flame
              className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${streak > 0 ? "text-orange-500 fill-orange-400" : "text-slate-400"}`}
            />
            <span className={`text-xs sm:text-sm font-bold tabular-nums ${streak > 0 ? "text-orange-900" : "text-slate-500"}`}>
              {streak}
            </span>
            <span className="hidden sm:inline text-[11px] font-medium text-slate-500">day{streak === 1 ? "" : "s"}</span>
          </div>

          <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 shrink-0">
            <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(241 245 249)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="url(#levelGradStudent)"
                strokeWidth="3"
                strokeDasharray={`${levelProgress * 88} 88`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="levelGradStudent" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute text-[10px] sm:text-xs font-bold text-violet-800">{level}</span>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-amber-50/90 px-2 py-1 border border-amber-200/80 shadow-sm">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            <span className="text-xs sm:text-sm font-bold text-amber-900 tabular-nums">{stars}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50/90 px-2 py-1 border border-emerald-200/80 shadow-sm">
            <Coins className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs sm:text-sm font-bold text-emerald-900 tabular-nums">{coins}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              typeof window !== "undefined" && sessionStorage.removeItem("student_child")
              window.location.href = "/login"
            }}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </Button>
        </div>
      </div>
    </header>
  )
}
