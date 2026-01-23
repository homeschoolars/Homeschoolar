import { prisma } from "@/lib/prisma"
import type { Prisma, PrismaClient } from "@prisma/client"

export async function logAnalyticsEvent({
  userId,
  childId,
  eventType,
  eventData,
  client,
}: {
  userId?: string | null
  childId?: string | null
  eventType: string
  eventData?: Record<string, unknown>
  client?: Prisma.TransactionClient | PrismaClient
}) {
  const db = client ?? prisma
  await db.analyticsEvent.create({
    data: {
      userId: userId ?? null,
      childId: childId ?? null,
      eventType,
      eventData: (eventData ?? {}) as unknown as object,
    },
  })
}
