import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { importCurriculumForAgeGroup, type CurriculumImportPayload } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    await requireRole("parent")

    const contentType = req.headers.get("content-type") ?? ""
    let ageGroup = ""
    let stageName: string | undefined
    let payload: CurriculumImportPayload | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      ageGroup = String(formData.get("ageGroup") ?? "").trim()
      stageName = String(formData.get("stageName") ?? "").trim() || undefined
      const file = formData.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "JSON file is required" }, { status: 400 })
      }
      const raw = await file.text()
      payload = JSON.parse(raw) as CurriculumImportPayload
    } else {
      const body = (await req.json()) as {
        ageGroup?: string
        stageName?: string
        payload?: CurriculumImportPayload
      }
      ageGroup = body.ageGroup?.trim() ?? ""
      stageName = body.stageName?.trim() || undefined
      payload = body.payload ?? null
    }

    if (!ageGroup) {
      return NextResponse.json({ error: "ageGroup is required" }, { status: 400 })
    }
    if (!payload) {
      return NextResponse.json({ error: "payload is required" }, { status: 400 })
    }

    const imported = await importCurriculumForAgeGroup({
      ageGroup,
      stageName,
      payload,
    })

    return NextResponse.json({ ok: true, imported })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import curriculum"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
