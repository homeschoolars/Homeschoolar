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
    icon: [
      {
        url: "/logo.png",
        sizes: "any",
      },
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${nunito.variable} ${fredoka.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
