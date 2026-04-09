import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { findUserByEmail, verifyPassword } from "@/services/auth-service"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

// JWT sessions + Credentials only: no database adapter (Auth.js does not require one in this setup).
// Avoids PrismaAdapter(getPrisma()) at module load, which could initialize the Prisma engine before
// Next binds PORT and makes Cloud Run report "failed to start and listen on PORT=8080".

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  /** Required on Cloud Run / Docker where Auth.js cannot infer a trusted host from platform env. */
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials || typeof credentials.email !== "string" || typeof credentials.password !== "string") {
          return null
        }

        const user = await findUserByEmail(credentials.email)
        if (!user?.passwordHash) return null
        const normalizedEmail = user.email.toLowerCase()
        const isLocalDemoAccount = normalizedEmail.endsWith("@homeschooler.local")
        const inNewOnboarding = user.onboardingComplete === false
        if (!user.emailVerified && !isLocalDemoAccount && !inNewOnboarding) return null

        const valid = await verifyPassword(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          adminRole: user.adminRole ?? undefined,
          onboardingComplete: user.onboardingComplete,
          guardianVerificationStatus: user.guardianVerificationStatus,
          eligibleForFreeEducation: user.eligibleForFreeEducation,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "parent"
        token.adminRole = (user as { adminRole?: string }).adminRole
        const u = user as {
          onboardingComplete?: boolean | null
          guardianVerificationStatus?: string
          eligibleForFreeEducation?: boolean
        }
        token.onboardingComplete = u.onboardingComplete
        token.guardianVerificationStatus = u.guardianVerificationStatus
        token.eligibleForFreeEducation = u.eligibleForFreeEducation
      }
      if (trigger === "update" && session?.user) {
        const su = session.user as {
          onboardingComplete?: boolean | null
          guardianVerificationStatus?: string
          eligibleForFreeEducation?: boolean
        }
        if (typeof su.onboardingComplete !== "undefined") {
          token.onboardingComplete = su.onboardingComplete
        }
        if (typeof su.guardianVerificationStatus !== "undefined") {
          token.guardianVerificationStatus = su.guardianVerificationStatus
        }
        if (typeof su.eligibleForFreeEducation !== "undefined") {
          token.eligibleForFreeEducation = su.eligibleForFreeEducation
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? "parent"
        session.user.adminRole = token.adminRole as string | undefined
        session.user.onboardingComplete = token.onboardingComplete as boolean | null | undefined
        session.user.guardianVerificationStatus = token.guardianVerificationStatus as string | undefined
        session.user.eligibleForFreeEducation = token.eligibleForFreeEducation as boolean | undefined
      }
      return session
    },
  },
})
