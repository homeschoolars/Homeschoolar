import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { getPrisma } from "@/lib/prisma"
import { findUserByEmail, verifyPassword } from "@/services/auth-service"

// Lazy adapter initialization - only creates PrismaClient when adapter is actually used
// This prevents Prisma from initializing during build time
const getAdapter = () => {
  // Only create adapter when actually needed (at runtime, not build time)
  return PrismaAdapter(getPrisma())
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: getAdapter(),
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
        if (!user.emailVerified) return null

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
