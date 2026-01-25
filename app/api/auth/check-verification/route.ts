import { NextResponse } from "next/server"
import { isEmailVerified } from "@/services/email-verification"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 })
  }
  try {
    const verified = await isEmailVerified(email.trim())
    return NextResponse.json({ verified })
  } catch (e) {
    console.error("[check-verification]", e)
    return NextResponse.json({ error: "Failed to check" }, { status: 500 })
  }
}
