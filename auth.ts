import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { findUserByEmail, verifyPassword } from "@/services/auth-service"

// JWT sessions + Credentials only: no database adapter (Auth.js does not require one in this setup).
// Avoids PrismaAdapter(getPrisma()) at module load, which could initialize the Prisma engine before
// Next binds PORT and makes Cloud Run report "failed to start and listen on PORT=8080".

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        if (!user.emailVerified && !isLocalDemoAccount) return null

        const valid = await verifyPassword(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          adminRole: user.adminRole ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "parent"
        token.adminRole = (user as { adminRole?: string }).adminRole
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? "parent"
        session.user.adminRole = token.adminRole as string | undefined
      }
      return session
    },
  },
})
