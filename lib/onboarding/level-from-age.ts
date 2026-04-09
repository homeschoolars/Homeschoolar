/** Display labels for onboarding (maps to curriculum-style bands). */
export function levelLabelFromAge(age: number): string {
  if (age <= 5) return "Little Explorers"
  if (age <= 7) return "Young Discoverers"
  if (age <= 9) return "Curious Minds"
  if (age <= 11) return "Junior Scholars"
  return "Future Leaders"
}
