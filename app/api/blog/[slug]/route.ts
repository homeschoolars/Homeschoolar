import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** GET /api/blog/[slug] — public single post. Increments view count. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "published" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })

    const related = await prisma.blogPost.findMany({
      where: {
        categoryId: post.categoryId,
        id: { not: post.id },
        status: "published" as const,
      },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        category: { select: { slug: true, name: true } },
      },
    })

    const readMinutes = Math.max(1, Math.ceil((post.content.split(/\s+/).length ?? 0) / 200))

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
        view_count: post.viewCount + 1,
        meta_title: post.metaTitle,
        meta_description: post.metaDescription,
        created_at: post.createdAt.toISOString(),
        updated_at: post.updatedAt.toISOString(),
        category: post.category,
        author: post.author ? { id: post.author.id, name: post.author.name } : null,
        read_minutes: readMinutes,
      },
      related: related.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        featured_image: r.featuredImage,
        published_at: r.publishedAt?.toISOString() ?? null,
        category: r.category,
      })),
    })
  } catch (error) {
    console.error("[blog slug]", error)
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 })
  }
}
