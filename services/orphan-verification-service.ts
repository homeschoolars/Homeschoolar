import { promises as fs } from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { logAnalyticsEvent } from "@/services/analytics-service"

const DEFAULT_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"]

function getAllowedTypes() {
  const raw = process.env.ORPHAN_DOC_ALLOWED_TYPES
  if (!raw) return DEFAULT_ALLOWED_TYPES
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function getStorageDir() {
  return process.env.ORPHAN_DOC_STORAGE_DIR || path.join(process.cwd(), "storage", "orphan-docs")
}

function parseBase64Document(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error("Invalid document format")
  }
  return { mimeType: match[1], base64Data: match[2] }
}

async function persistDocument({
  childId,
  documentName,
  base64Data,
  mimeType,
}: {
  childId: string
  documentName: string
  base64Data: string
  mimeType: string
}) {
  const allowedTypes = getAllowedTypes()
  if (!allowedTypes.includes(mimeType)) {
    throw new Error("Unsupported document type")
  }

  const storageDir = getStorageDir()
  await fs.mkdir(storageDir, { recursive: true })
  const extension = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1] ?? "bin"
  const safeName = `${childId}-${Date.now()}-${documentName.replace(/[^a-zA-Z0-9._-]/g, "")}`
  const fileName = `${safeName}.${extension}`
  const filePath = path.join(storageDir, fileName)
  await fs.writeFile(filePath, Buffer.from(base64Data, "base64"))
  return `orphan-docs/${fileName}`
}

export async function submitOrphanVerification({
  childId,
  parentId,
  documentType,
  documentName,
  documentBase64,
}: {
  childId: string
  parentId: string
  documentType: "death_certificate" | "ngo_letter" | "other"
  documentName: string
  documentBase64: string
}) {
  const child = await prisma.child.findFirst({ where: { id: childId, parentId } })
  if (!child) {
    throw new Error("Forbidden")
  }

  const existing = await prisma.orphanVerification.findFirst({
    where: { childId, status: { in: ["pending", "approved"] } },
  })
  if (existing) {
    throw new Error("Verification already submitted")
  }

  const { mimeType, base64Data } = parseBase64Document(documentBase64)
  const documentUrl = await persistDocument({ childId, documentName, base64Data, mimeType })

  const verification = await prisma.orphanVerification.create({
    data: {
      childId,
      submittedByParentId: parentId,
      documentType,
      documentUrl,
      status: "pending",
    },
  })

  await prisma.child.update({
    where: { id: childId },
    data: { isOrphan: true, orphanStatus: "pending" },
  })

  await logAnalyticsEvent({
    userId: parentId,
    childId,
    eventType: "orphan.submitted",
    eventData: { documentType },
  })

  return verification
}

export async function getOrphanStatus(childId: string, parentId: string, isAdmin = false) {
  const child = await prisma.child.findFirst({
    where: isAdmin ? { id: childId } : { id: childId, parentId },
  })
  if (!child) {
    throw new Error("Forbidden")
  }

  const verification = await prisma.orphanVerification.findFirst({
    where: { childId },
    orderBy: { createdAt: "desc" },
  })

  return {
    child,
    verification,
  }
}

export async function reviewOrphanVerification({
  verificationId,
  adminId,
  status,
  rejectionReason,
}: {
  verificationId: string
  adminId: string
  status: "approved" | "rejected"
  rejectionReason?: string | null
}) {
  const verification = await prisma.orphanVerification.findUnique({ where: { id: verificationId }, include: { child: true } })
  if (!verification) {
    throw new Error("Verification not found")
  }

  const childCount = await prisma.child.count({ where: { parentId: verification.child.parentId } })
  if (status === "approved" && childCount > 1) {
    throw new Error("Orphan plan requires a single child on the account")
  }
  if (status === "approved") {
    const existingSubscription = await prisma.subscription.findFirst({ where: { userId: verification.child.parentId } })
    if (existingSubscription && existingSubscription.type === "paid") {
      throw new Error("Paid subscription must be canceled before orphan approval")
    }
  }

  const updated = await prisma.orphanVerification.update({
    where: { id: verificationId },
    data: {
      status,
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
      rejectionReason: status === "rejected" ? rejectionReason ?? "Not eligible" : null,
    },
  })

  if (status === "approved") {
    await prisma.child.update({
      where: { id: verification.childId },
      data: { isOrphan: true, orphanStatus: "verified" },
    })

    await prisma.subscription.upsert({
      where: { userId: verification.child.parentId },
      update: {
        type: "orphan",
        plan: "trial",
        planType: null,
        status: "active",
        isFree: true,
        trialEndsAt: null,
        finalAmount: 0,
        discountPercentage: 0,
        discountAmount: 0,
        baseMonthlyPrice: 0,
        childCount,
      },
      create: {
        userId: verification.child.parentId,
        plan: "trial",
        type: "orphan",
        status: "active",
        isFree: true,
        finalAmount: 0,
        discountPercentage: 0,
        discountAmount: 0,
        baseMonthlyPrice: 0,
        childCount,
        startedAt: new Date(),
        startDate: new Date(),
      },
    })
  } else {
    await prisma.child.update({
      where: { id: verification.childId },
      data: { isOrphan: false, orphanStatus: "rejected" },
    })
  }

  await logAnalyticsEvent({
    userId: adminId,
    childId: verification.childId,
    eventType: "orphan.reviewed",
    eventData: { status },
  })

  return updated
}
