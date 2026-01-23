import type { AgeGroup } from "@/lib/types"

export function calculateAgeYears(dateOfBirth: Date, today = new Date()) {
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return age
}

export function deriveAgeGroup(ageYears: number): AgeGroup | null {
  if (ageYears >= 4 && ageYears <= 5) return "4-5"
  if (ageYears >= 6 && ageYears <= 7) return "6-7"
  if (ageYears >= 8 && ageYears <= 9) return "8-9"
  if (ageYears >= 10 && ageYears <= 11) return "10-11"
  if (ageYears >= 12 && ageYears <= 13) return "12-13"
  return null
}

export function validateElectives(ageYears: number, electives: string[] | undefined) {
  if (!electives) return
  if (ageYears < 8 && electives.length > 0) {
    throw new Error("Electives are locked for children under 8.")
  }
  if (ageYears >= 8 && electives.length !== 5) {
    throw new Error("Exactly 5 electives are required for children ages 8-13.")
  }
}
