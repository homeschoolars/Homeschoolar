import { type Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const PER_PAGE = 12

const listSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImage: true,
  publishedAt: true,
  viewCount: true,
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { name: true } },
} as const

/** GET /api/blog — public listing. ?page=1&category=slug&q=keyword */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const categorySlug = searchParams.get("category") ?? undefined
    const q = searchParams.get("q")?.trim() ?? undefined

    const where: Prisma.BlogPostWhereInput = {
      status: "published",
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      }),
    }

    const [total, posts, featured] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        select: listSelect,
      }),
      page === 1 && !q && !categorySlug
        ? prisma.blogPost.findFirst({
            where: { status: "published" },
            orderBy: { publishedAt: "desc" },
            select: listSelect,
          })
        : Promise.resolve(null),
    ])

    const items = posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      featured_image: p.featuredImage,
      published_at: p.publishedAt?.toISOString() ?? null,
      view_count: p.viewCount,
      category: p.category,
      author_name: p.author?.name ?? null,
    }))

    const featuredItem =
      featured && (items.length === 0 || featured.id !== items[0]?.id)
        ? {
            id: featured.id,
            title: featured.title,
            slug: featured.slug,
            excerpt: featured.excerpt,
            featured_image: featured.featuredImage,
            published_at: featured.publishedAt?.toISOString() ?? null,
            view_count: featured.viewCount,
            category: featured.category,
            author_name: featured.author?.name ?? null,
          }
        : null

    return NextResponse.json({
      posts: items,
      featured: featuredItem,
      total,
      page,
      per_page: PER_PAGE,
      total_pages: Math.ceil(total / PER_PAGE),
    })
  } catch (error) {
    console.error("[blog list]", error)
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 })
  }
}
