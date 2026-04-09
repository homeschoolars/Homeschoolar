import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  fatherStatus: z.enum(["alive", "deceased"]),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    const userId = session.user.id

    if (body.fatherStatus === "alive") {
      await prisma.$transaction([
        prisma.guardianVerificationDocument.deleteMany({ where: { userId } }),
        prisma.user.update({
          where: { id: userId },
          data: {
            fatherStatus: "alive",
            guardianVerificationStatus: "none",
            deathCertificateUrl: null,
            eligibleForFreeEducation: false,
          },
        }),
      ])
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { fatherStatus: "deceased" },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 400 })
  }
}
