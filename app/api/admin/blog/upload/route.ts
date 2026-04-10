import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { requireRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
])

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
}

/** POST multipart/form-data — field "file" — returns { url: "/uploads/blog/..." } */
export async function POST(req: Request) {
  try {
    await requireRole("admin")
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file required" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller" }, { status: 400 })
    }
    const type = file.type || "application/octet-stream"
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { error: "Use JPEG, PNG, GIF, or WebP" },
        { status: 400 }
      )
    }
    const ext = EXT[type] ?? (path.extname(file.name) || ".bin")
    const safeName = `${randomUUID()}${ext}`
    const dir = path.join(process.cwd(), "public", "uploads", "blog")
    await mkdir(dir, { recursive: true })
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, safeName), buf)
    const url = `/uploads/blog/${safeName}`
    return NextResponse.json({ url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    if (status === 500) console.error("[admin blog upload]", e)
    return NextResponse.json({ error: msg === "Forbidden" ? "Forbidden" : "Upload failed" }, { status })
  }
}
