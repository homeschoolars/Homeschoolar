export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { POST as generateWorksheetPost } from "../../../ai/generate-worksheet/route"

export async function POST(req: Request) {
  return generateWorksheetPost(req)
}
