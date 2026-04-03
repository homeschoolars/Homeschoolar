import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import {
  deleteCurriculumUnit,
  getCurriculumUnit,
  updateCurriculumUnit,
} from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId } = await params
    const unit = await getCurriculumUnit(decodeURIComponent(unitId))
    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }
    return NextResponse.json({ unit })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch unit"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    await requireRole("admin")

    const { unitId } = await params
    const body = (await req.json()) as Partial<{
      title: string
      slug: string
      displayOrder: number
    }>
    const unit = await updateCurriculumUnit(decodeURIComponent(unitId), body)
    return NextResponse.json({ unit })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update unit"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    await requireRole("admin")

    const { unitId } = await params
    await deleteCurriculumUnit(decodeURIComponent(unitId))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete unit"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
