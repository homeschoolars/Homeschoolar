import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"])

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 })
  }

  const mimeType = file.type || "application/octet-stream"
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json({ error: "Use PDF, JPG, or PNG" }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  const userId = session.user.id
  const viewPath = `/api/onboarding/certificate-file?userId=${encodeURIComponent(userId)}`

  await prisma.$transaction(async (tx) => {
    await tx.guardianVerificationDocument.upsert({
      where: { userId },
      create: {
        userId,
        mimeType,
        fileName: file.name || "certificate",
        data: buf,
      },
      update: {
        mimeType,
        fileName: file.name || "certificate",
        data: buf,
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        guardianVerificationStatus: "pending",
        deathCertificateUrl: viewPath,
      },
    })
  })

  return NextResponse.json({ url: viewPath, status: "pending" })
}
