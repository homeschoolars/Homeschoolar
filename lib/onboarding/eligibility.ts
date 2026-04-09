export function checkFreeEligibility(user: {
  role: string
  fatherStatus: string | null
  verificationStatus: string
}): boolean {
  return (
    user.role === "guardian" &&
    user.fatherStatus === "deceased" &&
    user.verificationStatus === "verified"
  )
}

export function checkTrialEligibility(user: {
  role: string
  fatherStatus: string | null
  verificationStatus: string
}): boolean {
  return (
    user.role === "guardian" &&
    user.fatherStatus === "deceased" &&
    user.verificationStatus === "pending"
  )
}
