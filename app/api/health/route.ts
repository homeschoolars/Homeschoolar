import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOpenAIConfigStatus } from "@/lib/openai"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const openai = getOpenAIConfigStatus()
    return NextResponse.json({
      ok: true,
      db: "connected",
      openai_configured: openai === "ok",
      openai_status: openai,
    })
  } catch (error) {
    console.error("Health check failed", error)
    return NextResponse.json({ ok: false, db: "error" }, { status: 500 })
  }
}
