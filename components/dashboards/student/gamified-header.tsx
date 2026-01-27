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
    <header className="sticky top-0 z-40 border-b-2 border-amber-200/80 bg-white/98 backdrop-blur shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="HomeSchoolar" width={34} height={34} className="rounded-lg" />
          <span className="text-base font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent hidden sm:inline">
            HomeSchoolar
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
          {/* Streak — Duolingo-style, always visible */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border-2 transition-all ${
              streak > 0
                ? "bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300 shadow-sm"
                : "bg-slate-100 border-slate-200"
            }`}
          >
            <Flame
              className={`h-5 w-5 sm:h-5 sm:w-5 ${streak > 0 ? "text-orange-500 fill-orange-400" : "text-slate-400"}`}
            />
            <span className={`text-sm font-bold tabular-nums ${streak > 0 ? "text-orange-800" : "text-slate-500"}`}>
              {streak}
            </span>
            <span className="hidden sm:inline text-xs font-medium text-slate-500">day{streak === 1 ? "" : "s"}</span>
          </div>

          {/* Level ring — Duolingo-style */}
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgb(226 232 240)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="url(#levelGrad)"
                strokeWidth="3"
                strokeDasharray={`${levelProgress * 88} 88`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute text-xs font-bold text-violet-800">{level}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 border-2 border-amber-300">
            <Star className="h-4 w-4 text-amber-600 fill-amber-500" />
            <span className="text-sm font-bold text-amber-800 tabular-nums">{stars}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 border-2 border-emerald-300">
            <Coins className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800 tabular-nums">{coins}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-red-50"
            onClick={() => {
              typeof window !== "undefined" && sessionStorage.removeItem("student_child")
              window.location.href = "/login"
            }}
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
