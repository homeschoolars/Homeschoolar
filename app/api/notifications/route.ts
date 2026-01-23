import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth-helpers"
import { z } from "zod"
import { serializeNotification } from "@/lib/serializers"

export async function GET() {
  try {
    const session = await requireSession()
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return NextResponse.json({ notifications: notifications.map(serializeNotification) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession()
    const body = z.object({ ids: z.array(z.string()).min(1) }).parse(await request.json())
    await prisma.notification.updateMany({
      where: { id: { in: body.ids }, userId: session.user.id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notifications"
    const status = message === "Unauthorized" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
