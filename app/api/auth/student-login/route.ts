import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Use service role to bypass RLS for student login validation
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const json = await request.json()
    console.log("Received login request", json)
    const { loginCode } = json

    if (!loginCode || typeof loginCode !== "string") {
      return NextResponse.json({ error: "Login code is required" }, { status: 400 })
    }

    // Query children table using service role to bypass RLS
    const { data: child, error } = await supabaseAdmin
      .from("children")
      .select("*")
      .eq("login_code", loginCode.toUpperCase().trim())
      .maybeSingle()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Unable to verify code. Please try again." }, { status: 500 })
    }

    if (!child) {
      return NextResponse.json({ error: "Invalid student code. Please check and try again." }, { status: 404 })
    }

    // Return child data (without sensitive parent info)
    return NextResponse.json({
      success: true,
      child: {
        id: child.id,
        name: child.name,
        age_group: child.age_group,
        current_level: child.current_level,
        assessment_completed: child.assessment_completed,
        login_code: child.login_code,
      },
    })
  } catch (error) {
    console.error("Student login error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
