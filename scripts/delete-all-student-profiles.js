/**
 * Remove every student row (`students` / Child) and dependent data.
 * Clears FK blockers: analytics_events.child_id and subscriptions.child_id (no ON DELETE CASCADE).
 * Parent User rows are unchanged; run remove-non-admin-users.js to drop parent accounts.
 *
 * Usage:
 *   node scripts/delete-all-student-profiles.js --dry-run
 *   node scripts/delete-all-student-profiles.js --force
 */

const path = require("path")
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") })
} catch {
  /* optional */
}

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes("--dry-run") || args.includes("-d")
  const force = args.includes("--force") || args.includes("-y")

  const count = await prisma.child.count()
  console.log(`Student profiles (Child rows) in database: ${count}`)
  if (count === 0) {
    return
  }

  if (dry) {
    console.log("DRY RUN — no changes.")
    return
  }

  if (!force) {
    console.log("Starting in 5s (Ctrl+C to cancel)...")
    await new Promise((r) => setTimeout(r, 5000))
  }

  const result = await prisma.$transaction(async (tx) => {
    const analytics = await tx.analyticsEvent.deleteMany({
      where: { childId: { not: null } },
    })
    const subs = await tx.subscription.updateMany({
      where: { childId: { not: null } },
      data: { childId: null },
    })
    const students = await tx.child.deleteMany({})
    return { analytics: analytics.count, subscriptionsCleared: subs.count, students: students.count }
  })

  console.log("Deletion summary:")
  Object.entries(result).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
