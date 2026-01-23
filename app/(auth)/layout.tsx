import type React from "react"
import { AnimatedBackground } from "@/components/ui/animated-background"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
