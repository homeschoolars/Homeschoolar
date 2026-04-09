import { AgeGroup } from "@prisma/client"
import type { AgeGroup as ApiAgeGroup } from "@/lib/types"

/** Prisma `Child.ageGroup` values; `curriculum_age_groups.name` uses API keys (`4-5`, …). */
const PRISMA_AGE_ENUM_VALUES: AgeGroup[] = [
  "AGE_4_5",
  "AGE_6_7",
  "AGE_8_9",
  "AGE_10_11",
  "AGE_12_13",
]

const apiToPrisma: Record<ApiAgeGroup, AgeGroup> = {
  "4-5": "AGE_4_5",
  "6-7": "AGE_6_7",
  "8-9": "AGE_8_9",
  "10-11": "AGE_10_11",
  "12-13": "AGE_12_13",
}

const prismaToApi: Record<AgeGroup, ApiAgeGroup> = {
  AGE_4_5: "4-5",
  AGE_6_7: "6-7",
  AGE_8_9: "8-9",
  AGE_10_11: "10-11",
  AGE_12_13: "12-13",
}

export function toPrismaAgeGroup(value: ApiAgeGroup) {
  return apiToPrisma[value]
}

export function toApiAgeGroup(value: AgeGroup) {
  return prismaToApi[value]
}

/** Resolve DB `curriculum_age_groups.name` from `Child.ageGroup` or an already-canonical name. */
export function toCurriculumAgeGroupName(ageGroup: string): string {
  if (PRISMA_AGE_ENUM_VALUES.includes(ageGroup as AgeGroup)) {
    return toApiAgeGroup(ageGroup as AgeGroup)
  }
  return ageGroup
}
