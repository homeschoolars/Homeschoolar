import { auth } from "@/auth"
import type { UserRole } from "@/lib/types"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import { STUDENT_SESSION_COOKIE, verifyStudentSessionToken } from "@/lib/student-session"

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
    throw new Error("Unauthorized")
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

function readCookie(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null
  const chunks = cookieHeader.split(";")
  for (const chunk of chunks) {
    const [rawName, ...rest] = chunk.trim().split("=")
    if (rawName === cookieName) {
      return decodeURIComponent(rest.join("="))
    }
  }
  return null
}

export async function enforceParentOrStudentChildAccess({
  childId,
  session,
  request,
}: {
  childId: string
  session: Session | null
  request: Request
}) {
  if (session?.user?.id) {
    await enforceParentChildAccess(childId, session)
    return
  }

  const token = readCookie(request, STUDENT_SESSION_COOKIE)
  if (!token) {
    throw new Error("Unauthorized")
  }
  const payload = verifyStudentSessionToken(token)
  if (!payload || payload.childId !== childId) {
    throw new Error("Forbidden")
  }
}
