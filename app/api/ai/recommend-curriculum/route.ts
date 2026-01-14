import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      type: z.enum(["subject", "topic", "worksheet", "activity"]),
      title: z.string(),
      description: z.string(),
      reason: z.string(),
      priority: z.number(),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const { child_id } = (await req.json()) as { child_id: string }

    const supabase = await createClient()

    // Get child info
    const { data: child } = await supabase.from("children").select("*").eq("id", child_id).single()

    if (!child) {
      return Response.json({ error: "Child not found" }, { status: 404 })
    }

    // Get progress
    const { data: progress } = await supabase.from("progress").select("*, subjects(name)").eq("child_id", child_id)

    // Get curriculum paths
    const { data: curriculumPaths } = await supabase
      .from("curriculum_paths")
      .select("*, subjects(name)")
      .eq("child_id", child_id)

    // Get recent submissions
    const { data: recentSubmissions } = await supabase
      .from("worksheet_submissions")
      .select("score, max_score, submitted_at")
      .eq("child_id", child_id)
      .order("submitted_at", { ascending: false })
      .limit(10)

    const prompt = `Generate personalized curriculum recommendations for a ${child.age_group} year old student.

Student Profile:
- Name: ${child.name}
- Current Level: ${child.current_level}
- Interests: ${child.interests?.join(", ") || "Not specified"}
- Learning Style: ${child.learning_style || "Not assessed"}

Progress Summary:
${progress?.map((p) => `- ${(p as any).subjects?.name}: ${p.average_score}% avg, ${p.completed_worksheets} completed`).join("\n") || "No progress data yet"}

Current Curriculum Paths:
${curriculumPaths?.map((cp) => `- ${(cp as any).subjects?.name}: Working on ${cp.current_topic}, Next: ${cp.next_topics?.slice(0, 2).join(", ")}`).join("\n") || "No curriculum paths set"}

Recent Performance:
${recentSubmissions?.map((s) => `- Score: ${s.score}/${s.max_score}`).join("\n") || "No recent submissions"}

Generate 5-8 personalized recommendations:
1. Suggest subjects they should focus on
2. Recommend specific topics based on their progress
3. Suggest activities that match their interests
4. Consider their learning level and style
5. Make recommendations encouraging and achievable

Prioritize recommendations (1 = highest priority).`

    const result = await generateObject({
      model: "google/gemini-2.0-flash",
      schema: recommendationSchema,
      prompt,
      maxOutputTokens: 2000,
    })

    // Clear old recommendations
    await supabase.from("ai_recommendations").delete().eq("child_id", child_id).eq("is_dismissed", false)

    // Save new recommendations
    const { error } = await supabase.from("ai_recommendations").insert(
      result.object.recommendations.map((rec) => ({
        child_id,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        reason: rec.reason,
        priority: rec.priority,
      })),
    )

    if (error) {
      console.error("Error saving recommendations:", error)
    }

    return Response.json({ recommendations: result.object.recommendations })
  } catch (error) {
    console.error("Error generating recommendations:", error)
    return Response.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
