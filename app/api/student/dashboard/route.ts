import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { childId } = await request.json()

    if (!childId) {
      return NextResponse.json({ error: "Child ID is required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
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
    const { data: subjects, error: subjectsError } = await supabaseAdmin
      .from("subjects")
      .select("*")
      .order("display_order")

    if (subjectsError) {
      console.error("Error fetching subjects:", subjectsError)
    }

    // Fetch assignments for this child
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
      console.error("Error fetching assignments:", assignmentsError)
    }

    // Fetch progress for this child
    const { data: progress, error: progressError } = await supabaseAdmin
      .from("progress")
      .select("*")
      .eq("child_id", childId)

    if (progressError) {
      console.error("Error fetching progress:", progressError)
    }

    // Fetch child's current data (in case it changed)
    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .select("*")
      .eq("id", childId)
      .single()

    if (childError) {
      console.error("Error fetching child:", childError)
    }

    const response = {
      success: true,
      subjects: subjects || [],
      assignments: assignments || [],
      progress: progress || [],
      child: child || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Student dashboard error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
