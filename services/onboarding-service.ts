import type {
  AttentionSpan,
  Gender,
  LearningMode,
  LearningStyle,
  ParentRelationship,
  Religion,
  ScreenTolerance,
} from "@/lib/types"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/services/auth-service"
import { calculateAgeYears, deriveAgeGroup, validateElectives } from "@/lib/onboarding-utils"
import { toPrismaAgeGroup } from "@/lib/age-group"
import { logAnalyticsEvent } from "@/services/analytics-service"
import { updateSubscriptionChildCount } from "@/services/subscription-service"
import { Prisma } from "@prisma/client"

export interface ParentSignupInput {
  fullName: string
  relationship: ParentRelationship
  email: string
  phone?: string | null
  country: string
  timezone: string
  password: string
}

export interface ChildSignupInput {
  fullName: string
  dateOfBirth: string
  gender?: Gender | null
  religion: Religion
  currentEducationLevel?: string | null
  interests: {
    preset?: string[]
    custom?: string | null
  }
  learningStyles: LearningStyle[]
  attentionSpan: AttentionSpan
  screenTolerance: ScreenTolerance
  needsEncouragement: boolean
  learnsBetterWith: LearningMode[]
  strengths?: string | null
  challenges?: string | null
  electives?: string[]
}

function normalizeInterestLabels(interests: ChildSignupInput["interests"]) {
  const labels = new Set<string>()
  for (const label of interests.preset ?? []) {
    if (label?.trim()) labels.add(label.trim())
  }
  if (interests.custom?.trim()) {
    labels.add(interests.custom.trim())
  }
  return Array.from(labels)
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

function parseDateOfBirth(value: string) {
  const dob = new Date(value)
  if (Number.isNaN(dob.getTime())) {
    throw new Error("Invalid date of birth")
  }
  return dob
}

async function createChildWithProfileInternal({
  tx,
  parentId,
  child,
  eventUserId,
}: {
  tx: Prisma.TransactionClient
  parentId: string
  child: ChildSignupInput
  eventUserId?: string | null
}) {
    const dateOfBirth = parseDateOfBirth(child.dateOfBirth)
    const ageYears = calculateAgeYears(dateOfBirth)
    const ageGroup = deriveAgeGroup(ageYears)
    if (!ageGroup) {
      throw new Error("Child age must be between 4 and 13 years")
    }
    validateElectives(ageYears, child.electives)

    const loginCode = await generateLoginCode(tx)
    const interestLabels = normalizeInterestLabels(child.interests)
    const childRecord = await tx.child.create({
      data: {
        parentId,
        name: child.fullName,
        ageGroup: toPrismaAgeGroup(ageGroup),
        loginCode,
        learningStyle: child.learningStyles[0] ?? null,
        interests: interestLabels,
      },
    })

    await tx.childProfile.create({
      data: {
        childId: childRecord.id,
        dateOfBirth,
        ageYears,
        gender: child.gender ?? null,
        religion: child.religion,
        educationLevel: child.currentEducationLevel ?? null,
        strengths: child.strengths ?? null,
        challenges: child.challenges ?? null,
      },
    })

    await tx.learningPreference.create({
      data: {
        childId: childRecord.id,
        learningStyles: child.learningStyles,
        attentionSpan: child.attentionSpan,
        screenTolerance: child.screenTolerance,
        needsEncouragement: child.needsEncouragement,
        learnsBetterWith: child.learnsBetterWith,
      },
    })

    if (interestLabels.length > 0) {
      await tx.childInterest.createMany({
        data: interestLabels.map((label) => ({
          childId: childRecord.id,
          label,
          source: child.interests.custom?.trim() === label ? "custom" : "preset",
        })),
      })
    }

    await logAnalyticsEvent({
      userId: eventUserId ?? parentId,
      childId: childRecord.id,
      eventType: "onboarding.child_created",
      eventData: { ageYears, ageGroup },
      client: tx,
    })

    return childRecord
}

export async function createChildWithProfile({
  parentId,
  child,
  eventUserId,
}: {
  parentId: string
  child: ChildSignupInput
  eventUserId?: string | null
}) {
  const childRecord = await prisma.$transaction((tx) =>
    createChildWithProfileInternal({ tx, parentId, child, eventUserId }),
  )
  await updateSubscriptionChildCount(parentId)
  return childRecord
}

export async function createParentWithChildren({
  parent,
  children,
}: {
  parent: ParentSignupInput
  children: ChildSignupInput[]
}) {
  if (children.length === 0) {
    throw new Error("At least one child is required")
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: parent.email } })
    if (existing) {
      throw new Error("Email already in use")
    }

    const passwordHash = await hashPassword(parent.password)
    const user = await tx.user.create({
      data: {
        email: parent.email,
        name: parent.fullName,
        role: "parent",
        passwordHash,
      },
    })

    await tx.parent.create({
      data: {
        userId: user.id,
        fullName: parent.fullName,
        relationship: parent.relationship,
        email: parent.email,
        phone: parent.phone ?? null,
        country: parent.country,
        timezone: parent.timezone,
      },
    })

    for (const child of children) {
      await createChildWithProfileInternal({ tx, parentId: user.id, child, eventUserId: user.id })
    }

    await logAnalyticsEvent({
      userId: user.id,
      eventType: "onboarding.signup_completed",
      eventData: { childrenCount: children.length },
      client: tx,
    })

    return user
  })
}

export async function updateChildProfile({
  childId,
  parentId,
  data,
  isAdmin,
}: {
  childId: string
  parentId: string
  data: Partial<Omit<ChildSignupInput, "fullName" | "dateOfBirth" | "religion">> & {
    fullName?: string
    dateOfBirth?: string
    religion?: Religion
  }
  isAdmin?: boolean
}) {
  return prisma.$transaction(async (tx) => {
    const child = await tx.child.findFirst({
      where: isAdmin ? { id: childId } : { id: childId, parentId },
    })
    if (!child) throw new Error("Forbidden")

    const existingProfile = await tx.childProfile.findUnique({ where: { childId } })

    let ageYears: number | null = null
    let ageGroup: ReturnType<typeof deriveAgeGroup> | null = null
    let dob: Date | null = null

    if (data.dateOfBirth) {
      dob = parseDateOfBirth(data.dateOfBirth)
      ageYears = calculateAgeYears(dob)
      ageGroup = deriveAgeGroup(ageYears)
      if (!ageGroup) {
        throw new Error("Child age must be between 4 and 13 years")
      }
      validateElectives(ageYears, data.electives)
    }

    if (!existingProfile && !data.dateOfBirth) {
      throw new Error("Date of birth is required to create a profile")
    }

    const interestLabels = data.interests ? normalizeInterestLabels(data.interests) : null

    if (data.fullName || ageGroup || data.learningStyles || interestLabels) {
      await tx.child.update({
        where: { id: childId },
        data: {
          name: data.fullName ?? undefined,
          ageGroup: ageGroup ? toPrismaAgeGroup(ageGroup) : undefined,
          learningStyle: data.learningStyles?.[0] ?? undefined,
          interests: interestLabels ?? undefined,
        },
      })
    }

    if (
      data.dateOfBirth ||
      data.gender ||
      data.religion ||
      data.currentEducationLevel ||
      data.strengths ||
      data.challenges
    ) {
      await tx.childProfile.upsert({
        where: { childId },
        update: {
          dateOfBirth: dob ?? undefined,
          ageYears: ageYears ?? undefined,
          gender: data.gender ?? undefined,
          religion: data.religion ?? undefined,
          educationLevel: data.currentEducationLevel ?? undefined,
          strengths: data.strengths ?? undefined,
          challenges: data.challenges ?? undefined,
        },
        create: {
          childId,
          dateOfBirth: dob ?? new Date(),
          ageYears: ageYears ?? calculateAgeYears(dob ?? new Date()),
          gender: data.gender ?? null,
          religion: data.religion ?? "non_muslim",
          educationLevel: data.currentEducationLevel ?? null,
          strengths: data.strengths ?? null,
          challenges: data.challenges ?? null,
        },
      })
    }

    if (
      data.learningStyles ||
      data.attentionSpan ||
      data.screenTolerance ||
      typeof data.needsEncouragement === "boolean" ||
      data.learnsBetterWith
    ) {
      await tx.learningPreference.upsert({
        where: { childId },
        update: {
          learningStyles: data.learningStyles ?? undefined,
          attentionSpan: data.attentionSpan ?? undefined,
          screenTolerance: data.screenTolerance ?? undefined,
          needsEncouragement: data.needsEncouragement ?? undefined,
          learnsBetterWith: data.learnsBetterWith ?? undefined,
        },
        create: {
          childId,
          learningStyles: data.learningStyles ?? [],
          attentionSpan: data.attentionSpan ?? "medium",
          screenTolerance: data.screenTolerance ?? "medium",
          needsEncouragement: data.needsEncouragement ?? false,
          learnsBetterWith: data.learnsBetterWith ?? [],
        },
      })
    }

    if (interestLabels) {
      await tx.childInterest.deleteMany({ where: { childId } })
      if (interestLabels.length > 0) {
        await tx.childInterest.createMany({
          data: interestLabels.map((label) => ({
            childId,
            label,
            source: data.interests?.custom?.trim() === label ? "custom" : "preset",
          })),
        })
      }
    }

    await logAnalyticsEvent({
      userId: parentId,
      childId,
      eventType: "onboarding.child_updated",
      eventData: { updatedFields: Object.keys(data) },
      client: tx,
    })

    return tx.child.findUnique({
      where: { id: childId },
      include: { profile: true, preferences: true, interestsV2: true },
    })
  })
}

export async function getChildAiProfileSummary(childId: string) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { profile: true, preferences: true, interestsV2: true },
  })
  if (!child || !child.profile || !child.preferences) {
    throw new Error("Child profile incomplete")
  }

  const ageYears = child.profile.ageYears
  const ageGroup = deriveAgeGroup(ageYears)
  if (!ageGroup) {
    throw new Error("Child age must be between 4 and 13 years")
  }

  const summary = {
    child_id: child.id,
    age_years: ageYears,
    age_group: ageGroup,
    religion: child.profile.religion,
    learning_styles: child.preferences.learningStyles,
    attention_span: child.preferences.attentionSpan,
    screen_tolerance: child.preferences.screenTolerance,
    needs_encouragement: child.preferences.needsEncouragement,
    learns_better_with: child.preferences.learnsBetterWith,
    interests: child.interestsV2.map((interest) => interest.label),
    strengths: child.profile.strengths ?? null,
    challenges: child.profile.challenges ?? null,
    islamic_studies_enabled: child.profile.religion === "muslim",
    electives_locked: ageYears < 8,
    electives_required: ageYears >= 8 ? 5 : null,
    updated_at: new Date().toISOString(),
  }

  await prisma.childProfile.update({
    where: { childId },
    data: {
      aiSummary: summary as unknown as object,
    },
  })

  await logAnalyticsEvent({
    userId: child.parentId,
    childId,
    eventType: "onboarding.ai_profile_summary",
  })

  return summary
}
