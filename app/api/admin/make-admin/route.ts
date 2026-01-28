import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const makeAdminSchema = z.object({
  email: z.string().email(),
  admin_role: z.enum(["super_admin", "content_admin", "support_admin", "finance_admin"]).optional(),
})

/**
 * POST /api/admin/make-admin
 * 
 * Make a user an admin. This endpoint should be protected or removed in production.
 * For now, it's available for initial setup.
 * 
 * In production, you should:
 * 1. Remove this endpoint, OR
 * 2. Add additional security (e.g., require a secret key, or only allow from specific IPs)
 */
export async function POST(request: Request) {
  try {
    // TODO: Add security check in production
    // For example: require a secret key or restrict to localhost
    const authHeader = request.headers.get("authorization")
    const secretKey = process.env.ADMIN_SETUP_SECRET

    if (secretKey && authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = makeAdminSchema.parse(await request.json())
    const adminRole = body.admin_role || "super_admin"

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (!user) {
      return NextResponse.json({ error: `User with email "${body.email}" not found` }, { status: 404 })
    }

    if (user.role === "admin" && user.adminRole === adminRole) {
      return NextResponse.json({
        message: `User "${body.email}" is already an admin with role "${adminRole}"`,
        user: {
          email: user.email,
          role: user.role,
          admin_role: user.adminRole,
        },
      })
    }

    const updated = await prisma.user.update({
      where: { email: body.email },
      data: {
        role: "admin",
        adminRole: adminRole,
      },
    })

    return NextResponse.json({
      message: `Successfully set user "${body.email}" as admin`,
      user: {
        email: updated.email,
        role: updated.role,
        admin_role: updated.adminRole,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Failed to make user admin"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
