/**
 * Central branding for UI, metadata, and PDFs. Override via NEXT_PUBLIC_* env vars.
 */
export type SiteBranding = {
  appName: string
  tagline: string
  /** Public path (e.g. /logo.png) or absolute URL */
  logoSrc: string
}

const DEFAULT_DESCRIPTION =
  "Personalized worksheets, progress tracking, and curriculum management for homeschooled children ages 4–13. Powered by AI."

export function getSiteBranding(): SiteBranding {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Homeschoolars",
    tagline: process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Raising Thinkers, Not Just Students",
    logoSrc: process.env.NEXT_PUBLIC_APP_LOGO_URL?.trim() || "/homeschoolars-logo-v2.png",
  }
}

export function getSiteDescription(): string {
  return process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() || DEFAULT_DESCRIPTION
}

/** Browser title: "AppName — tagline" */
export function getDefaultPageTitle(): string {
  const { appName, tagline } = getSiteBranding()
  return `${appName} — ${tagline}`
}

/** Build absolute logo URL for server-side PDF rendering */
export function resolveLogoAbsolute(origin: string, branding: SiteBranding): string {
  if (branding.logoSrc.startsWith("http://") || branding.logoSrc.startsWith("https://")) {
    return branding.logoSrc
  }
  const path = branding.logoSrc.startsWith("/") ? branding.logoSrc : `/${branding.logoSrc}`
  return `${origin.replace(/\/$/, "")}${path}`
}
