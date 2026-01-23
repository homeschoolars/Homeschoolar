import { NextResponse } from "next/server"
import { handlePayoneerWebhook } from "@/services/payments.service"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-payoneer-signature")
    await handlePayoneerWebhook(rawBody, signature)
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
