"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/notifications/notification-center"

export function ParentPageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/homeschoolars-logo-v2.png" alt="HomeSchoolar Logo" width={40} height={40} />
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-xl font-bold text-transparent">
              HomeSchoolar
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/parent" className="text-sm font-medium text-teal-600">
              Dashboard
            </Link>
            <Link href="/parent/worksheets" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Worksheets
            </Link>
            <Link href="/parent/progress" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Progress
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="border-t bg-white md:hidden">
          <div className="container mx-auto flex items-center gap-4 px-4 py-2 text-sm">
            <Link href="/parent" className="font-medium text-teal-600">
              Dashboard
            </Link>
            <Link href="/parent/worksheets" className="font-medium text-gray-600 hover:text-teal-600">
              Worksheets
            </Link>
            <Link href="/parent/progress" className="font-medium text-gray-600 hover:text-teal-600">
              Progress
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-gray-600">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  )
}
