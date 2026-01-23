import { NextResponse } from "next/server"
import { handleJazzCashWebhook } from "@/services/payments.service"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-jazzcash-signature")
    await handleJazzCashWebhook(rawBody, signature)
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
