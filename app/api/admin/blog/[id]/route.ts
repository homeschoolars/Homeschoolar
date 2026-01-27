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

/** GET /api/admin/blog/[id] — single post for edit. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
    })
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        category_id: post.categoryId,
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
    const msg = e instanceof Error ? e.message : "Failed to load post"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/** PATCH /api/admin/blog/[id] — update post. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const body = (await request.json()) as {
      title?: string
      slug?: string
      content?: string
      excerpt?: string
      category_id?: string
      featured_image?: string
      status?: "draft" | "published"
      published_at?: string | null
      meta_title?: string | null
      meta_description?: string | null
    }

    const post = await prisma.blogPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updates: {
      title?: string
      slug?: string
      content?: string
      excerpt?: string | null
      categoryId?: string
      featuredImage?: string | null
      status?: "draft" | "published"
      publishedAt?: Date | null
      metaTitle?: string | null
      metaDescription?: string | null
    } = {}

    if (body.title != null) updates.title = body.title.trim()
    if (body.slug != null) updates.slug = body.slug.trim() || slugify(body.title ?? post.title)
    if (body.content != null) updates.content = body.content
    if (body.excerpt != null) updates.excerpt = body.excerpt.trim() || null
    if (body.category_id != null) {
      const cat = await prisma.blogCategory.findUnique({ where: { id: body.category_id } })
      if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 })
      updates.categoryId = body.category_id
    }
    if (body.featured_image != null) updates.featuredImage = body.featured_image.trim() || null
    if (body.status != null) updates.status = body.status
    if (body.published_at !== undefined) {
      updates.publishedAt = body.published_at ? new Date(body.published_at) : null
    }
    if (body.meta_title !== undefined) updates.metaTitle = body.meta_title?.trim() || null
    if (body.meta_description !== undefined) updates.metaDescription = body.meta_description?.trim() || null

    if (updates.slug && updates.slug !== post.slug) {
      const existing = await prisma.blogPost.findFirst({
        where: { slug: updates.slug, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: "Post slug already exists" }, { status: 400 })
      }
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updates,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      post: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        content: updated.content,
        excerpt: updated.excerpt,
        category_id: updated.categoryId,
        featured_image: updated.featuredImage,
        status: updated.status,
        published_at: updated.publishedAt?.toISOString() ?? null,
        view_count: updated.viewCount,
        meta_title: updated.metaTitle,
        meta_description: updated.metaDescription,
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
        category: updated.category,
        author: updated.author ? { id: updated.author.id, name: updated.author.name } : null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update post"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/** DELETE /api/admin/blog/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin")
    const { id } = await params
    await prisma.blogPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete post"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
