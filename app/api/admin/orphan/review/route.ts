import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { reviewOrphanVerification } from "@/services/orphan-verification-service"
import { logAdminAction } from "@/services/admin-audit-service"

const reviewSchema = z.object({
  verificationId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
})

export async function GET() {
  try {
    await requireAdminRole(["super_admin", "support_admin"])
    const queue = await prisma.orphanVerification.findMany({
      where: { status: "pending" },
      include: { child: true, submittedBy: true },
      orderBy: { createdAt: "asc" },
    })
    const verifiedCount = await prisma.child.count({ where: { orphanStatus: "verified" } })
    return NextResponse.json({
      queue: queue.map((item) => ({
        id: item.id,
        child_id: item.childId,
        child_name: item.child.name,
        parent_id: item.submittedByParentId,
        parent_name: item.submittedBy.name ?? "Parent",
        document_type: item.documentType,
        document_url: `/api/admin/orphan/document/${item.id}`,
        created_at: item.createdAt.toISOString(),
      })),
      metrics: {
        verified_count: verifiedCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch queue"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminRole(["super_admin", "support_admin"])
    const body = reviewSchema.parse(await request.json())
    const updated = await reviewOrphanVerification({
      verificationId: body.verificationId,
      adminId: session.user.id,
      status: body.status,
      rejectionReason: body.rejectionReason,
    })
    await logAdminAction({
      adminId: session.user.id,
      action: "orphan.review",
      targetType: "orphan_verification",
      targetId: body.verificationId,
      metadata: { status: body.status, rejectionReason: body.rejectionReason ?? null },
    })
    return NextResponse.json({ verification: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review verification"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
