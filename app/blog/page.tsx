import { getBlogApiBase } from "@/lib/blog-base-url"
import { BlogListing } from "@/components/blog/blog-listing"

export const dynamic = "force-dynamic"
export const revalidate = 60

export const metadata = {
  title: "Blog | Homeschoolars",
  description:
    "Parenting tips, learning advice, AI in education, and product updates from Homeschoolars.",
  openGraph: {
    title: "Blog | Homeschoolars",
    description:
      "Parenting tips, learning advice, AI in education, and product updates from Homeschoolars.",
  },
}

type ListingPayload = {
  posts: Array<{
    id: string
    title: string
    slug: string
    excerpt: string | null
    featured_image: string | null
    published_at: string | null
    view_count: number
    category: { id: string; name: string; slug: string }
    author_name: string | null
  }>
  featured: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    featured_image: string | null
    published_at: string | null
    view_count: number
    category: { id: string; name: string; slug: string }
    author_name: string | null
  } | null
  total: number
  page: number
  per_page: number
  total_pages: number
}

export default async function BlogPage() {
  const base = await getBlogApiBase()
  let initialData: ListingPayload | null = null
  let categories: { id: string; name: string; slug: string; display_order?: number; post_count: number }[] = []

  try {
    const [listRes, catRes] = await Promise.all([
      fetch(`${base}/api/blog?page=1`, { next: { revalidate: 60 } }),
      fetch(`${base}/api/blog/categories`, { next: { revalidate: 60 } }),
    ])
    if (listRes.ok) initialData = (await listRes.json()) as ListingPayload
    if (catRes.ok) {
      const catJson = (await catRes.json()) as { categories: typeof categories }
      categories = catJson.categories ?? []
    }
  } catch {
    // pass
  }

  return <BlogListing initialData={initialData} categories={categories} />
}
