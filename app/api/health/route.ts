import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Avoid top-level `import "@prisma/client"` here — loading the Prisma engine during module init can throw in standalone Docker before GET runs (generic HTML 500). */

function sanitizeMessage(message: string): string {
  return message
    .replace(/postgresql:\/\/[^:]*:[^@\s]+@/gi, "postgresql://***:***@")
    .replace(/postgres:\/\/[^:]*:[^@\s]+@/gi, "postgres://***:***@")
    .slice(0, 400)
}

function dbErrorDetail(err: unknown): string {
  if (err instanceof Error) {
    return sanitizeMessage(err.message)
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return sanitizeMessage(String((err as { message: unknown }).message))
  }
  return sanitizeMessage(String(err))
}

async function openaiFields() {
  try {
    const { getOpenAIConfigStatus } = await import("@/lib/openai-config")
    const openai_status = getOpenAIConfigStatus()
    return {
      openai_status,
      openai_configured: openai_status === "ok",
    }
  } catch (e) {
    console.error("[health] openai status failed", e)
    return { openai_status: "error" as const, openai_configured: false }
  }
}

export async function GET(): Promise<Response> {
  try {
    const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim())
    const openai = await openaiFields()

    if (!databaseUrlConfigured) {
      return NextResponse.json(
        {
          ok: false,
          database_url_configured: false,
          db: "error",
          db_detail: "DATABASE_URL is not set on this service.",
          ...openai,
        },
        { status: 503 },
      )
    }

    const { prisma } = await import("@/lib/prisma")
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        ok: true,
        database_url_configured: true,
        db: "connected",
        ...openai,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[health] check failed", error)
    const openai = await openaiFields()
    return NextResponse.json(
      {
        ok: false,
        database_url_configured: Boolean(process.env.DATABASE_URL?.trim()),
        db: "error",
        db_detail: dbErrorDetail(error),
        ...openai,
      },
      { status: 503 },
    )
  }
}
