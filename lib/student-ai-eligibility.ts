import type { AgeGroup } from "@/lib/types"

const MIN_AI_AGE = 4

/** Server + client: self-service lesson AI for enrolled ages (4+), using DOB when known else curriculum band (e.g. "5-6" → 5). */
export function studentMeetsLessonAiAge(ageYears: number | null | undefined, ageGroup: AgeGroup | string): boolean {
  if (ageYears != null && Number.isFinite(ageYears)) {
    return ageYears >= MIN_AI_AGE
  }
  const first = String(ageGroup).split("-")[0]
  const start = Number.parseInt(first, 10)
  return Number.isFinite(start) && start >= MIN_AI_AGE
}

/** Client-only when only `age_group` from student session is available (e.g. "4-5", "5-6"). */
export function studentMeetsLessonAiBand(ageBand: string): boolean {
  const first = String(ageBand).split("-")[0]
  const start = Number.parseInt(first, 10)
  return Number.isFinite(start) && start >= MIN_AI_AGE
}
