import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getGeminiConfigStatus } from "@/lib/google-ai"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const gemini = getGeminiConfigStatus()
    return NextResponse.json({
      ok: true,
      db: "connected",
      gemini_configured: gemini === "ok",
      gemini_status: gemini,
    })
  } catch (error) {
    console.error("Health check failed", error)
    return NextResponse.json({ ok: false, db: "error" }, { status: 500 })
  }
}
