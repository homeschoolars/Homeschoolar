import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export async function GET() {
  try {
    await requireRole("admin")

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { children: true } },
      },
    })

    const list = users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.name ?? null,
      role: u.role,
      created_at: u.createdAt.toISOString(),
      children_count: u._count.children,
    }))

    return NextResponse.json({ users: list })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
