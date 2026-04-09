import type { ReactNode } from "react"

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f8f6ff] text-slate-900 antialiased [font-family:var(--font-sans),system-ui,sans-serif]">
      {children}
    </div>
  )
}
