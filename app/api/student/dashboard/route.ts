import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  console.log("[v0] Student dashboard API called")

  try {
    const { childId } = await request.json()
    console.log("[v0] Received childId:", childId)

    if (!childId) {
      console.log("[v0] No childId provided")
      return NextResponse.json({ error: "Child ID is required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("[v0] Supabase URL available:", !!supabaseUrl)
    console.log("[v0] Service Role Key available:", !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      console.log("[v0] Missing Supabase credentials")
      return NextResponse.json(
        {
          error: "Server configuration error - missing Supabase credentials",
        },
        { status: 500 },
      )
    }

    // Use service role to bypass RLS for student dashboard data
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Fetch subjects
    console.log("[v0] Fetching subjects...")
    const { data: subjects, error: subjectsError } = await supabaseAdmin
      .from("subjects")
      .select("*")
      .order("display_order")

    if (subjectsError) {
      console.error("[v0] Error fetching subjects:", subjectsError)
    } else {
      console.log("[v0] Fetched subjects count:", subjects?.length || 0)
    }

    // Fetch assignments for this child
    console.log("[v0] Fetching assignments...")
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("worksheet_assignments")
      .select(`
        *,
        worksheet:worksheets(*)
      `)
      .eq("child_id", childId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (assignmentsError) {
      console.error("[v0] Error fetching assignments:", assignmentsError)
    } else {
      console.log("[v0] Fetched assignments count:", assignments?.length || 0)
    }

    // Fetch progress for this child
    console.log("[v0] Fetching progress...")
    const { data: progress, error: progressError } = await supabaseAdmin
      .from("progress")
      .select("*")
      .eq("child_id", childId)

    if (progressError) {
      console.error("[v0] Error fetching progress:", progressError)
    } else {
      console.log("[v0] Fetched progress count:", progress?.length || 0)
    }

    // Fetch child's current data (in case it changed)
    console.log("[v0] Fetching child data...")
    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .select("*")
      .eq("id", childId)
      .single()

    if (childError) {
      console.error("[v0] Error fetching child:", childError)
    } else {
      console.log("[v0] Fetched child:", child?.name)
    }

    const response = {
      success: true,
      subjects: subjects || [],
      assignments: assignments || [],
      progress: progress || [],
      child: child || null,
    }

    console.log("[v0] Returning response with subjects:", response.subjects.length)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Student dashboard error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
