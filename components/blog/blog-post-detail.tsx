"use client"

import { useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import { Calendar, User, Clock, Facebook, Twitter, Linkedin } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type RelatedItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
  category: { slug: string; name: string }
}

type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  featured_image: string | null
  published_at: string | null
  view_count: number
  meta_title: string | null
  meta_description: string | null
  category: { id: string; name: string; slug: string }
  author: { id: string; name: string } | null
  read_minutes: number
}

interface BlogPostDetailProps {
  post: Post
  related: RelatedItem[]
  canonicalUrl: string
}

function extractHeadings(md: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = []
  const regex = /^(#{1,3})\s+(.+)$/gm
  let m: RegExpExecArray | null
  while ((m = regex.exec(md)) !== null) {
    const level = m[1].length
    const text = m[2].trim()
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section"
    headings.push({ level, text, id })
  }
  return headings
}

export function BlogPostDetail({ post, related, canonicalUrl }: BlogPostDetailProps) {
  const headings = extractHeadings(post.content)
  const headingIndex = useRef(0)
  const shareTitle = encodeURIComponent(post.title)
  const shareUrl = encodeURIComponent(canonicalUrl)

  const getNextHeadingId = () => {
    const i = headingIndex.current
    headingIndex.current += 1
    return headings[i]?.id ?? `h-${i}`
  }

  return (
    <article className="container mx-auto px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <Link
            href="/blog"
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            ← Blog
          </Link>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-sm text-slate-500">{post.category.name}</span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {post.author?.name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {post.author.name}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.read_minutes} min read
            </span>
          </div>
        </header>

        {post.featured_image && (
          <div className="relative aspect-video mb-10 overflow-hidden rounded-xl">
            <Image
              src={post.featured_image}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_200px]">
          <div className="min-w-0">
            <div className="blog-content [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-800 [&_p]:mb-4 [&_p]:text-slate-700 [&_p]:leading-relaxed [&_a]:text-teal-600 [&_a]:underline [&_a:hover]:text-teal-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_img]:rounded-lg [&_img]:my-4">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...p }) => {
                    const id = getNextHeadingId()
                    return <h1 id={id} className="scroll-mt-24" {...p} />
                  },
                  h2: ({ node, ...p }) => {
                    const id = getNextHeadingId()
                    return <h2 id={id} className="scroll-mt-24" {...p} />
                  },
                  h3: ({ node, ...p }) => {
                    const id = getNextHeadingId()
                    return <h3 id={id} className="scroll-mt-24" {...p} />
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          {headings.length > 0 && (
            <nav className="hidden lg:block shrink-0" aria-label="Table of contents">
              <div className="sticky top-24 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  On this page
                </p>
                <ul className="mt-3 space-y-2">
                  {headings.map((h) => (
                    <li key={h.id} style={{ paddingLeft: (h.level - 1) * 12 }}>
                      <a
                        href={`#${h.id}`}
                        className="text-sm text-slate-600 hover:text-teal-600"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-8">
          <span className="text-sm font-medium text-slate-500">Share</span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            aria-label="Share on Facebook"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            aria-label="Share on X"
          >
            <Twitter className="h-4 w-4" />
          </a>
          <a
            href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            aria-label="Share on LinkedIn"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-slate-200 pt-12">
            <h2 className="text-xl font-bold text-slate-900">Related articles</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {related.map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="group flex gap-4">
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {r.featured_image ? (
                      <Image
                        src={r.featured_image}
                        alt=""
                        fill
                        className="object-cover group-hover:opacity-90"
                        sizes="128px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-teal-600">{r.category.name}</span>
                    <h3 className="mt-0.5 font-semibold text-slate-900 group-hover:text-teal-700 line-clamp-2">
                      {r.title}
                    </h3>
                    {r.published_at && (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDistanceToNow(new Date(r.published_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
