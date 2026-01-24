import { auth } from "@/auth"
import type { UserRole } from "@/lib/types"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireRole(roles: UserRole[] | UserRole) {
  const session = await requireSession()
  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(session.user.role as UserRole)) {
    throw new Error("Forbidden")
  }
  return session
}

export async function requireAdminRole(roles: Array<"super_admin" | "content_admin" | "support_admin" | "finance_admin">) {
  const session = await requireRole("admin")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { adminRole: true } })
  if (!user?.adminRole) {
    throw new Error("Forbidden")
  }
  if (!roles.includes(user.adminRole)) {
    throw new Error("Forbidden")
  }
  return session
}

export async function enforceParentChildAccess(childId: string, session: Session | null) {
  if (!session?.user?.id) {
    return
  }
  if (session.user.role === "admin") {
    return
  }
  if (session.user.role !== "parent") {
    throw new Error("Forbidden")
  }
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
    select: { id: true },
  })
  if (!child) {
    throw new Error("Forbidden")
  }
}
