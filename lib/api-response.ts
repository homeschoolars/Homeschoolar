import { NextResponse } from "next/server"

export type ApiErrorBody = {
  success: false
  error: string
  details?: unknown
}

export type ApiSuccessBody<T> = {
  success: true
  data: T
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccessBody<T>, init)
}

export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error, ...(details !== undefined ? { details } : {}) } satisfies ApiErrorBody, {
    status,
  })
}

export function statusFromErrorMessage(message: string, fallback = 500) {
  if (message === "Unauthorized") return 401
  if (message === "Forbidden") return 403
  if (message === "NotFound") return 404
  if (message === "WorksheetsIncomplete" || message === "LecturesIncomplete" || message === "QuizRequired") return 409
  if (message.includes("limit") || message.includes("quota")) return 429
  return fallback
}
