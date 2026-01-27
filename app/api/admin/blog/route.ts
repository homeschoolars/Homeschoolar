import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** GET /api/admin/blog — list all posts (incl. drafts). ?page=1&status=draft|published */
export async function GET(request: Request) {
  try {
    await requireRole("admin")
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const status = searchParams.get("status") as "draft" | "published" | null
    const perPage = 20

    const where = status ? { status } : {}

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: [{ status: "asc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          author: { select: { id: true, name: true } },
        },
      }),
    ])

    const list = posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      featured_image: p.featuredImage,
      status: p.status,
      published_at: p.publishedAt?.toISOString() ?? null,
      view_count: p.viewCount,
      meta_title: p.metaTitle,
      meta_description: p.metaDescription,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
      category: p.category,
      author: p.author ? { id: p.author.id, name: p.author.name } : null,
    }))

    return NextResponse.json({
      posts: list,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load posts"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/** POST /api/admin/blog — create post. */
export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    const body = (await request.json()) as {
      title: string
      slug?: string
      content: string
      excerpt?: string
      category_id: string
      featured_image?: string
      status?: "draft" | "published"
      published_at?: string
      meta_title?: string
      meta_description?: string
    }

    const slug = body.slug?.trim() || slugify(body.title)
    const existing = await prisma.blogPost.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Post slug already exists" }, { status: 400 })
    }

    const category = await prisma.blogCategory.findUnique({
      where: { id: body.category_id },
    })
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 })
    }

    const isPublished = body.status === "published"
    const publishedAt = body.published_at
      ? new Date(body.published_at)
      : isPublished
        ? new Date()
        : null

    const post = await prisma.blogPost.create({
      data: {
        title: body.title.trim(),
        slug,
        content: body.content,
        excerpt: body.excerpt?.trim() || null,
        categoryId: body.category_id,
        authorId: session.user.id,
        featuredImage: body.featured_image?.trim() || null,
        status: (body.status as "draft" | "published") || "draft",
        publishedAt,
        metaTitle: body.meta_title?.trim() || null,
        metaDescription: body.meta_description?.trim() || null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        featured_image: post.featuredImage,
        status: post.status,
        published_at: post.publishedAt?.toISOString() ?? null,
        view_count: post.viewCount,
        meta_title: post.metaTitle,
        meta_description: post.metaDescription,
        created_at: post.createdAt.toISOString(),
        updated_at: post.updatedAt.toISOString(),
        category: post.category,
        author: post.author ? { id: post.author.id, name: post.author.name } : null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create post"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
