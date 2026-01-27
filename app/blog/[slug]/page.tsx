import { notFound } from "next/navigation"
import { getBlogApiBase } from "@/lib/blog-base-url"
import { BlogPostDetail } from "@/components/blog/blog-post-detail"

export const dynamic = "force-dynamic"
export const revalidate = 60

type Params = { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const base = await getBlogApiBase()
  const res = await fetch(`${base}/api/blog/${slug}`, { next: { revalidate: 60 } })
  if (!res.ok) return { title: "Blog | Homeschoolars" }
  const json = (await res.json()) as { post: { title: string; meta_title?: string | null; meta_description?: string | null; excerpt?: string | null } }
  const post = json.post
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
    },
  }
}

export default async function BlogSlugPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const base = await getBlogApiBase()
  const res = await fetch(`${base}/api/blog/${slug}`, { next: { revalidate: 60 } })
  if (!res.ok) {
    if (res.status === 404) notFound()
    throw new Error("Failed to load post")
  }
  const json = (await res.json()) as {
    post: {
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
    related: Array<{
      id: string
      title: string
      slug: string
      excerpt: string | null
      featured_image: string | null
      published_at: string | null
      category: { slug: string; name: string }
    }>
  }
  const canonicalUrl = `${base}/blog/${slug}`

  return (
    <BlogPostDetail
      post={json.post}
      related={json.related}
      canonicalUrl={canonicalUrl}
    />
  )
}
