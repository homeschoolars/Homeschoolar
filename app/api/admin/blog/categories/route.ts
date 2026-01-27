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

/** GET /api/admin/blog/categories — list all. */
export async function GET() {
  try {
    await requireRole("admin")
    const categories = await prisma.blogCategory.findMany({
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { posts: true } } },
    })
    const list = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      display_order: c.displayOrder,
      post_count: c._count.posts,
      created_at: c.createdAt.toISOString(),
    }))
    return NextResponse.json({ categories: list })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load categories"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/** POST /api/admin/blog/categories — create. */
export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = (await request.json()) as { name: string; slug?: string; display_order?: number }
    const slug = body.slug?.trim() || slugify(body.name)
    const existing = await prisma.blogCategory.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Category slug already exists" }, { status: 400 })
    }
    const c = await prisma.blogCategory.create({
      data: {
        name: body.name.trim(),
        slug,
        displayOrder: body.display_order ?? 0,
      },
    })
    return NextResponse.json({
      category: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        display_order: c.displayOrder,
        created_at: c.createdAt.toISOString(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create category"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
