"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/notifications/notification-center"

export type ParentNavKey = "dashboard" | "worksheets" | "progress"

export function ParentAppHeader({ active }: { active: ParentNavKey }) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
    router.push("/login")
  }

  const linkClass = (key: ParentNavKey) =>
    key === active
      ? "px-4 py-1.5 text-sm font-semibold rounded-lg bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/80"
      : "px-4 py-1.5 text-sm font-medium rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all"

  const mobileLinkClass = (key: ParentNavKey) =>
    key === active
      ? "px-3 py-1 text-sm font-semibold rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-200/60"
      : "px-3 py-1 text-sm font-medium rounded-lg text-slate-500 hover:bg-slate-50"

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group shrink-0">
          <Image
            src="/homeschoolars-logo-v2.png"
            alt="HomeSchoolar Logo"
            width={36}
            height={36}
            className="rounded-lg group-hover:scale-[1.03] transition-transform"
          />
          <span className="text-lg font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 bg-clip-text text-transparent tracking-tight truncate">
            HomeSchoolar
          </span>
        </Link>

        <nav className="hidden md:flex items-center">
          <div className="flex items-center rounded-xl bg-slate-100/90 p-1 gap-0.5 ring-1 ring-slate-200/60">
            <Link href="/parent" className={linkClass("dashboard")}>
              Dashboard
            </Link>
            <Link href="/parent/worksheets" className={linkClass("worksheets")}>
              Worksheets
            </Link>
            <Link href="/parent/progress" className={linkClass("progress")}>
              Progress
            </Link>
            <Link
              href="/assessment"
              className="px-4 py-1.5 text-sm font-medium rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-all"
            >
              Assessment
            </Link>
          </div>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <NotificationCenter />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
            aria-label="Log out"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white/90 md:hidden backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-1 px-4 py-2 overflow-x-auto">
          <Link href="/parent" className={mobileLinkClass("dashboard")}>
            Dashboard
          </Link>
          <Link href="/parent/worksheets" className={mobileLinkClass("worksheets")}>
            Worksheets
          </Link>
          <Link href="/parent/progress" className={mobileLinkClass("progress")}>
            Progress
          </Link>
          <Link href="/assessment" className="px-3 py-1 text-sm font-medium rounded-lg text-slate-500 hover:bg-slate-50 shrink-0">
            Assessment
          </Link>
        </div>
      </div>
    </header>
  )
}
