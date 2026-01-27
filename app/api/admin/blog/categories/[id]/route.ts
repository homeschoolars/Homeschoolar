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

/** PATCH /api/admin/blog/categories/[id] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const body = (await request.json()) as {
      name?: string
      slug?: string
      display_order?: number
    }
    const updates: { name?: string; slug?: string; displayOrder?: number } = {}
    if (body.name != null) updates.name = body.name.trim()
    if (body.slug != null) updates.slug = body.slug.trim() || slugify(body.name ?? "")
    if (body.display_order != null) updates.displayOrder = body.display_order

    if (updates.slug) {
      const existing = await prisma.blogCategory.findFirst({
        where: { slug: updates.slug, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: "Category slug already exists" }, { status: 400 })
      }
    }

    const c = await prisma.blogCategory.update({
      where: { id },
      data: updates,
    })
    return NextResponse.json({
      category: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        display_order: c.displayOrder,
        updated_at: c.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update category"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/** DELETE /api/admin/blog/categories/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const count = await prisma.blogPost.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with posts. Move or delete posts first." },
        { status: 400 }
      )
    }
    await prisma.blogCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete category"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
