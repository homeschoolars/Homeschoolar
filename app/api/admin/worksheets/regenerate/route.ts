export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { POST as generateWorksheetPost } from "../../../ai/generate-worksheet/route"
import { requireRole } from "@/lib/auth-helpers"

export async function POST(req: Request) {
  await requireRole("admin")
  return generateWorksheetPost(req)
}
