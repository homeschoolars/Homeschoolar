import type { AgeGroup as ApiAgeGroup, LearningClassKey } from "@/lib/types"

/**
 * One-year learning bands (display). Curriculum / Prisma still use broader `AgeGroup` buckets internally.
 */
export function getLearningClassFromAgeYears(ageYears: number): { key: LearningClassKey; label: string } {
  const y = Math.floor(ageYears)
  if (y < 4) return { key: "little_explorers", label: "Little Explorers" }
  if (y > 13) return { key: "future_leaders", label: "Future Leaders" }
  const table: Record<number, { key: LearningClassKey; label: string }> = {
    4: { key: "little_explorers", label: "Little Explorers" },
    5: { key: "mini_adventurers", label: "Mini Adventurers" },
    6: { key: "curious_minds", label: "Curious Mind" },
    7: { key: "young_investigators", label: "Young Investigators" },
    8: { key: "growing_learners", label: "Growing Learners" },
    9: { key: "knowledge_explorers", label: "Knowledge Explorers" },
    10: { key: "knowledge_builders", label: "Knowledge Builders" },
    11: { key: "skill_sharpeners", label: "Skill Sharpeners" },
    12: { key: "future_leaders", label: "Future Leaders" },
    13: { key: "future_leaders", label: "Future Leaders" },
  }
  return table[y] ?? { key: "future_leaders", label: "Future Leaders" }
}

/** Parent password gate before holistic quiz (young learners). */
export function learningClassRequiresParentPassword(key: LearningClassKey): boolean {
  return key === "little_explorers" || key === "mini_adventurers"
}

/** Student dashboard “young” styling and news band 4–7 vs 8–13. */
export function isYoungLearnerClassKey(key: LearningClassKey): boolean {
  return (
    key === "little_explorers" ||
    key === "mini_adventurers" ||
    key === "curious_minds" ||
    key === "young_investigators"
  )
}

/** Backfill class fields for older `sessionStorage` payloads (e.g. before student re-login). */
export function augmentChildLearningFields(child: {
  age_group: ApiAgeGroup
  learning_class?: string
  learning_class_key?: LearningClassKey
}): { learning_class: string; learning_class_key: LearningClassKey } {
  const fromAge = getLearningClassLabelFromApiAgeGroup(child.age_group)
  return {
    learning_class: child.learning_class ?? fromAge.label,
    learning_class_key: child.learning_class_key ?? fromAge.key,
  }
}

/** When profile DOB is missing, infer class label from stored curriculum bucket. */
export function getLearningClassLabelFromApiAgeGroup(ageGroup: ApiAgeGroup): { key: LearningClassKey; label: string } {
  const fallbackAge: Record<ApiAgeGroup, number> = {
    "4-5": 4,
    "6-7": 6,
    "8-9": 8,
    "10-11": 10,
    "12-13": 12,
  }
  return getLearningClassFromAgeYears(fallbackAge[ageGroup])
}
