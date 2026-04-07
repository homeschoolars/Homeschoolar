import type { LearningClassKey } from "@/lib/types"
import { learningClassRequiresParentPassword } from "@/lib/learning-class"

/** Little Explorers & Mini Adventurers — parent password before the holistic quiz. */
export function needsParentPasswordForHolisticAssessment(learningClassKey: LearningClassKey): boolean {
  return learningClassRequiresParentPassword(learningClassKey)
}
