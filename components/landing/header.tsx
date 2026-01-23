"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, Sparkles } from "lucide-react"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Curriculum", href: "#curriculum" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 w-full border-b-4 border-transparent bg-gradient-to-r from-white/90 via-white/70 to-white/90 shadow-lg shadow-purple/10 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{
        borderImage:
          "linear-gradient(90deg, var(--pink), var(--purple), var(--blue), var(--cyan), var(--green), var(--yellow), var(--orange)) 1",
      }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="HomeSchoolar Logo"
            width={48}
            height={48}
            className="group-hover:scale-105 transition-transform"
          />
          <span className="font-heading text-xl font-bold text-rainbow hidden sm:inline">HomeSchoolar</span>
          <Sparkles className="h-4 w-4 text-yellow animate-pulse hidden sm:block" />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-white/70 px-2 py-1 ring-1 ring-purple/10 shadow-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/70 transition-all hover:bg-purple/10 hover:text-purple"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            asChild
            className="font-semibold hover:bg-purple/10 hover:text-purple transition-all"
          >
            <Link href="/login">Log In</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-purple via-pink to-orange font-semibold shadow-lg hover:shadow-purple/25 hover:opacity-90 hover:scale-105 transition-all"
          >
            <Link href="/signup">Start Free Trial</Link>
          </Button>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/10 md:hidden hover:bg-purple/20 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5 text-purple" /> : <Menu className="h-5 w-5 text-purple" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t-2 border-purple/20 bg-gradient-to-b from-purple/5 to-pink/5 md:hidden">
          <nav className="container mx-auto flex flex-col gap-2 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-purple/10 hover:text-purple hover:translate-x-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t-2 border-purple/10 pt-4">
              <Button
                variant="outline"
                asChild
                className="w-full border-2 border-purple/30 hover:bg-purple/10 bg-transparent"
              >
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild className="w-full bg-gradient-to-r from-purple via-pink to-orange">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
