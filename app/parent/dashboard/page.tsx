import { redirect } from "next/navigation"

/**
 * Alias URL for parent home; supports query params (e.g. assessment completion toast).
 */
export default async function ParentDashboardAlias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x))
    else q.set(k, v)
  }
  const s = q.toString()
  redirect(s ? `/parent?${s}` : "/parent")
}
