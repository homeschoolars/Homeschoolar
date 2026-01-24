import { prisma } from "@/lib/prisma"

export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  metadata,
}: {
  adminId: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      metadata: (metadata ?? {}) as unknown as object,
    },
  })
}
