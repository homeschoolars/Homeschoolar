import type { AgeGroup } from "@prisma/client"

export function representativeAgeFromAgeGroup(ag: AgeGroup): number {
  const m: Record<AgeGroup, number> = {
    AGE_4_5: 5,
    AGE_6_7: 7,
    AGE_8_9: 9,
    AGE_10_11: 11,
    AGE_12_13: 13,
  }
  return m[ag] ?? 8
}

/** Prefer profile age in 4–13; otherwise map age group band to a representative age. */
export function getAssessmentAgeYears(profile: { ageYears: number } | null | undefined, ageGroup: AgeGroup): number {
  const y = profile?.ageYears
  if (typeof y === "number" && y >= 4 && y <= 13) return y
  return representativeAgeFromAgeGroup(ageGroup)
}
