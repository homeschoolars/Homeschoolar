import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** GET /api/blog/categories — public, all categories with published post counts. */
export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        posts: {
          where: { status: "published" },
          select: { id: true },
        },
      },
    })

    const list = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      display_order: c.displayOrder,
      post_count: c.posts.length,
    }))

    return NextResponse.json({ categories: list })
  } catch (error) {
    console.error("[blog categories]", error)
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 })
  }
}
