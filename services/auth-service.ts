import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { UserRole } from "@prisma/client"

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export async function registerUser({
  email,
  password,
  fullName,
  role = "parent",
}: {
  email: string
  password: string
  fullName?: string | null
  role?: UserRole
}) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("Email already in use")
  }

  const passwordHash = await hashPassword(password)

  return prisma.user.create({
    data: {
      email,
      name: fullName ?? null,
      role,
      passwordHash,
    },
  })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}
