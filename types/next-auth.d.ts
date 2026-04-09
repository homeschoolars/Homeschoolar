import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      adminRole?: string
      /** false = must finish /register flow; null/undefined = legacy account */
      onboardingComplete?: boolean | null
      guardianVerificationStatus?: string
      eligibleForFreeEducation?: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    adminRole?: string
    onboardingComplete?: boolean | null
    guardianVerificationStatus?: string
    eligibleForFreeEducation?: boolean
  }
}
