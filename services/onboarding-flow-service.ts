import type { AgeGroup as PrismaAgeGroup, ParentRelationship, Religion } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/services/auth-service"
import { toPrismaAgeGroup } from "@/lib/age-group"
import type { AgeGroup as ApiAgeGroup } from "@/lib/types"
import { Prisma } from "@prisma/client"

function ageToApiAgeGroup(age: number): ApiAgeGroup {
  if (age <= 5) return "4-5"
  if (age <= 7) return "6-7"
  if (age <= 9) return "8-9"
  if (age <= 11) return "10-11"
  return "12-13"
}

function religionLabelToEnum(label: string): Religion {
  return label.trim().toLowerCase() === "islam" ? "muslim" : "non_muslim"
}

function familyRoleToParentRelationship(role: "parent" | "guardian"): ParentRelationship {
  return role === "guardian" ? "guardian" : "mother"
}

async function generateLoginCode(tx: Prisma.TransactionClient) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let code = ""
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    const exists = await tx.child.findUnique({ where: { loginCode: code } })
    if (!exists) return code
  }
  throw new Error("Unable to generate unique login code")
}

export async function registerOnboardingUser(input: {
  name: string
  email: string
  password: string
  phone: string
  country: string
  religion: string
  role: "parent" | "guardian"
  timezone?: string
}) {
  const email = input.email.trim().toLowerCase()
  const passwordHash = await hashPassword(input.password)
  const tz = input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } })
    if (existing) {
      const err = new Error("Email already in use")
      ;(err as Error & { code?: string }).code = "EMAIL_EXISTS"
      throw err
    }

    const user = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
        role: "parent",
        passwordHash,
        emailVerified: new Date(),
        onboardingComplete: false,
        onboardingPhone: input.phone.trim(),
        onboardingCountry: input.country.trim(),
        onboardingReligionLabel: input.religion.trim(),
        familyRole: input.role,
        fatherStatus: null,
        guardianVerificationStatus: "none",
        deathCertificateUrl: null,
        eligibleForFreeEducation: false,
      },
    })

    await tx.parent.create({
      data: {
        userId: user.id,
        fullName: input.name.trim(),
        relationship: familyRoleToParentRelationship(input.role),
        email,
        phone: input.phone.trim(),
        country: input.country.trim(),
        timezone: tz,
      },
    })

    return user
  })
}

export async function createOnboardingStudent(input: {
  userId: string
  name: string
  age: number
  levelLabel: string
  goals: string | null
  interests: string[]
  isMuslim: boolean
}) {
  const ageGroup: PrismaAgeGroup = toPrismaAgeGroup(ageToApiAgeGroup(input.age))
  const year = new Date().getFullYear()
  const dateOfBirth = new Date(year - input.age, 5, 15)
  const religion: Religion = input.isMuslim ? "muslim" : "non_muslim"

  return prisma.$transaction(async (tx) => {
    const loginCode = await generateLoginCode(tx)
    const child = await tx.child.create({
      data: {
        parentId: input.userId,
        name: input.name.trim(),
        ageGroup,
        loginCode,
        interests: input.interests,
        learningGoals: input.goals?.trim() || null,
        learningStyle: "visual",
      },
    })

    await tx.childProfile.create({
      data: {
        childId: child.id,
        dateOfBirth,
        ageYears: input.age,
        gender: null,
        religion,
        educationLevel: input.levelLabel,
        strengths: null,
        challenges: null,
      },
    })

    await tx.learningPreference.create({
      data: {
        childId: child.id,
        learningStyles: ["visual"],
        attentionSpan: "medium",
        screenTolerance: "medium",
        needsEncouragement: false,
        learnsBetterWith: ["step_by_step"],
      },
    })

    if (input.interests.length > 0) {
      await tx.childInterest.createMany({
        data: input.interests.map((label) => ({
          childId: child.id,
          label,
          source: "preset" as const,
        })),
      })
    }

    return child
  })
}

export async function assignOnboardingPlan(input: {
  userId: string
  planType: "free" | "trial"
  trialStart?: Date
  trialEnd?: Date
}) {
  const now = new Date()
  const childCount = await prisma.child.count({ where: { parentId: input.userId } })
  if (childCount <= 0) throw new Error("At least one student is required")

  if (input.planType === "free") {
    const trialEndsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    await prisma.subscription.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        plan: "trial",
        type: "trial",
        status: "active",
        isFree: true,
        trialEndsAt: trialEndsAt,
        startedAt: now,
        startDate: now,
        childCount,
      },
      update: {
        plan: "trial",
        type: "trial",
        status: "active",
        isFree: true,
        trialEndsAt,
        childCount,
      },
    })
  } else {
    const trialStart = input.trialStart ?? now
    const trialEnd = input.trialEnd ?? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    await prisma.subscription.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        plan: "trial",
        type: "trial",
        status: "active",
        isFree: true,
        trialEndsAt: trialEnd,
        startedAt: trialStart,
        startDate: trialStart,
        childCount,
      },
      update: {
        plan: "trial",
        type: "trial",
        status: "active",
        isFree: true,
        trialEndsAt: trialEnd,
        startedAt: trialStart,
        childCount,
      },
    })
    const parent = await prisma.parent.findUnique({ where: { userId: input.userId } })
    if (parent) {
      await prisma.parent.update({
        where: { id: parent.id },
        data: { trialUsedAt: trialStart },
      })
    }
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { onboardingComplete: true },
  })
}

export { religionLabelToEnum }
