/* eslint-disable @next/next/no-img-element -- featured images use arbitrary admin-pasted URLs */
"use client"

import { normalizeBlogImageUrl } from "@/lib/blog-image-url"
import { cn } from "@/lib/utils"

type BlogImageFillProps = {
  src: string | null | undefined
  alt?: string
  className?: string
  priority?: boolean
}

/**
 * Featured/card images are user-supplied (any host). Plain <img> avoids Next/Image remote allow-list issues.
 */
export function BlogImageFill({ src, alt = "", className, priority }: BlogImageFillProps) {
  const href = src ? normalizeBlogImageUrl(src) : null
  if (!href) return null
  return (
    <img
      src={href}
      alt={alt}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  )
}
