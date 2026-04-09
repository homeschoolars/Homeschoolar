import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getOpenAIConfigStatus } from "@/lib/openai-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sanitizeMessage(message: string): string {
  return message
    .replace(/postgresql:\/\/[^:]*:[^@\s]+@/gi, "postgresql://***:***@")
    .replace(/postgres:\/\/[^:]*:[^@\s]+@/gi, "postgres://***:***@")
    .slice(0, 400)
}

function dbErrorDetail(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return sanitizeMessage(`${err.code}: ${err.message}`)
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return sanitizeMessage(err.message)
  }
  if (err instanceof Error) {
    return sanitizeMessage(err.message)
  }
  return sanitizeMessage(String(err))
}

export async function GET(): Promise<Response> {
  try {
    const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim())

    const body: Record<string, unknown> = {
      ok: false,
      database_url_configured: databaseUrlConfigured,
      db: "unknown",
      openai_configured: false,
      openai_status: "missing" as const,
    }

    if (!databaseUrlConfigured) {
      body.db = "error"
      body.db_detail = "DATABASE_URL is not set on this service."
      try {
        body.openai_status = getOpenAIConfigStatus()
        body.openai_configured = body.openai_status === "ok"
      } catch (e) {
        console.error("[health] openai status failed", e)
        body.openai_status = "error"
      }
      return NextResponse.json(body, { status: 503 })
    }

    const { prisma } = await import("@/lib/prisma")
    await prisma.$queryRaw`SELECT 1`

    body.ok = true
    body.db = "connected"
    try {
      const openai = getOpenAIConfigStatus()
      body.openai_status = openai
      body.openai_configured = openai === "ok"
    } catch (e) {
      console.error("[health] openai status failed", e)
      body.openai_status = "error"
    }

    return NextResponse.json(body, { status: 200 })
  } catch (error) {
    console.error("[health] check failed", error)

    let openai_status: ReturnType<typeof getOpenAIConfigStatus> | "error" = "missing"
    try {
      openai_status = getOpenAIConfigStatus()
    } catch {
      openai_status = "error"
    }

    return NextResponse.json(
      {
        ok: false,
        database_url_configured: Boolean(process.env.DATABASE_URL?.trim()),
        db: "error",
        db_detail: dbErrorDetail(error),
        openai_configured: openai_status === "ok",
        openai_status,
      },
      { status: 503 },
    )
  }
}
