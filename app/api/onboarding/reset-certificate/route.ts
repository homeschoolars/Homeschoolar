import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Guardian switched father from deceased → alive: clear stored certificate + status. */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  await prisma.$transaction([
    prisma.guardianVerificationDocument.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        guardianVerificationStatus: "none",
        deathCertificateUrl: null,
        eligibleForFreeEducation: false,
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
