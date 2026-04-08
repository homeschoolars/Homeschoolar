import { NextResponse } from "next/server"

/** Fast readiness for Cloud Run startup probes — no DB or external calls. */
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}
