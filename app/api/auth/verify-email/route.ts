import { NextResponse } from "next/server"
import { verifyTokenAndMarkVerified } from "@/services/email-verification"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const LOGIN = "/login"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(`${APP_URL}${LOGIN}?error=missing_token`)
  }
  try {
    const email = await verifyTokenAndMarkVerified(token)
    if (!email) {
      return NextResponse.redirect(`${APP_URL}${LOGIN}?error=invalid_token`)
    }
    return NextResponse.redirect(`${APP_URL}${LOGIN}?verified=1`)
  } catch (e) {
    console.error("[verify-email]", e)
    return NextResponse.redirect(`${APP_URL}${LOGIN}?error=invalid_token`)
  }
}
