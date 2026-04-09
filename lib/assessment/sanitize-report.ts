export function stripHiddenFromStoredJson(report: unknown): unknown {
  if (!report || typeof report !== "object") return report
  const r = { ...(report as Record<string, unknown>) }
  delete r.hiddenDifficultyLevel
  return r
}
