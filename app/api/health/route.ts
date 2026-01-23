import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: "connected" })
  } catch (error) {
    console.error("Health check failed", error)
    return NextResponse.json({ ok: false, db: "error" }, { status: 500 })
  }
}
