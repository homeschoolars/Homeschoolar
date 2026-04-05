import type { AgeGroup } from "@/lib/types"

/** Product rule: self-service AI generation for students older than 7 (age years ≥ 8 or age band starting at 8+). */
export function studentMeetsLessonAiAge(ageYears: number | null | undefined, ageGroup: AgeGroup | string): boolean {
  if (ageYears != null && Number.isFinite(ageYears)) {
    return ageYears > 7
  }
  const first = String(ageGroup).split("-")[0]
  const start = Number.parseInt(first, 10)
  return Number.isFinite(start) && start >= 8
}
