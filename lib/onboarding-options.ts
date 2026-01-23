import type { AttentionSpan, LearningMode, LearningStyle, ParentRelationship, Religion, ScreenTolerance } from "@/lib/types"

export const parentRelationships: ParentRelationship[] = ["father", "mother", "guardian", "other"]

export const religionOptions: Religion[] = ["muslim", "non_muslim"]

export const attentionSpanOptions: AttentionSpan[] = ["short", "medium", "long"]

export const screenToleranceOptions: ScreenTolerance[] = ["low", "medium", "high"]

export const learningStyleOptions: LearningStyle[] = ["visual", "auditory", "reading_writing", "kinesthetic"]

export const learningModeOptions: LearningMode[] = ["games", "stories", "challenges", "step_by_step"]

export const interestPresets = [
  "Art & Drawing",
  "Technology",
  "Nature",
  "Building things",
  "Speaking & storytelling",
  "Problem solving",
  "Numbers & logic",
  "Creativity",
]
