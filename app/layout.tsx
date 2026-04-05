import type React from "react"
import type { Metadata } from "next"
import { Inter, Nunito, Fredoka } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { getDefaultPageTitle, getSiteBranding, getSiteDescription } from "@/lib/site-branding"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const nunito = Nunito({ subsets: ["latin"], variable: "--font-sans" })
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-heading" })

export function generateMetadata(): Metadata {
  const { appName } = getSiteBranding()
  return {
    title: getDefaultPageTitle(),
    description: getSiteDescription(),
    keywords: ["homeschool", "education", "AI learning", "worksheets", "curriculum", "children education", appName],
    icons: {
      icon: [{ url: "/favicon.png?v=2", type: "image/png" }],
      apple: "/favicon.png?v=2",
      shortcut: "/favicon.png?v=2",
    },
  }
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        {enableVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
