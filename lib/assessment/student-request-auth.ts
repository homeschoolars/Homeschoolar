import { STUDENT_SESSION_COOKIE, verifyStudentSessionToken } from "@/lib/student-session"

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

/** Returns childId if the request carries a valid student session cookie. */
export function getChildIdFromStudentRequest(request: Request): string | null {
  const raw = readCookie(request, STUDENT_SESSION_COOKIE)
  if (!raw) return null
  const payload = verifyStudentSessionToken(raw)
  return payload?.childId ?? null
}
