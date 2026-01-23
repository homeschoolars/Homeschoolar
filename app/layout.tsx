import type React from "react"
import type { Metadata } from "next"
import { Inter, Nunito, Fredoka } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const nunito = Nunito({ subsets: ["latin"], variable: "--font-sans" })
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-heading" })

export const metadata: Metadata = {
  title: "HomeSchoolar - Raising Thinkers, Not Just Students",
  description:
    "Personalized worksheets, progress tracking, and curriculum management for homeschooled children ages 4-13. Powered by AI.",
  keywords: ["homeschool", "education", "AI learning", "worksheets", "curriculum", "children education"],
  icons: {
    icon: [{ url: "/logo.png", sizes: "any" }],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
}

export const viewport = {
  themeColor: "#A855F7",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const enableVercelAnalytics = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "true"

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${nunito.variable} ${fredoka.variable} font-sans antialiased`}>
        {children}
        {enableVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
