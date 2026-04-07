/**
 * Delete every User row (including admins) and all data that cascades or is cleaned up
 * the same way as remove-non-admin-users.js. Curriculum catalog rows (subjects, lessons,
 * etc.) are NOT tied to users and are left intact.
 *
 * WARNING: Irreversible. Back up the database first.
 *
 * Usage:
 *   node -r dotenv/config scripts/wipe-all-users.js --dry-run
 *   node -r dotenv/config scripts/wipe-all-users.js --confirm DELETE_ALL_USER_DATA --force
 */

const path = require("path")
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") })
} catch {
  /* optional */
}

const { PrismaClient } = require("@prisma/client")
const { deleteUsersTransaction } = require("./lib/delete-users-core")

const prisma = new PrismaClient()

const REQUIRED_CONFIRM = "DELETE_ALL_USER_DATA"

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run") || args.includes("-d")
  const force = args.includes("--force") || args.includes("-y")
  const confirmIdx = args.indexOf("--confirm")
  const confirm =
    confirmIdx >= 0 && args[confirmIdx + 1] && !args[confirmIdx + 1].startsWith("-")
      ? args[confirmIdx + 1]
      : null

  console.log("=".repeat(60))
  console.log("Wipe ALL user accounts (including admins)")
  console.log("=".repeat(60))
  console.log()

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, adminRole: true, createdAt: true },
    orderBy: { email: "asc" },
  })

  if (allUsers.length === 0) {
    console.log("No users in database. Nothing to do.")
    return
  }

  console.log(`Found ${allUsers.length} user(s):`)
  allUsers.forEach((u) =>
    console.log(
      `  - ${u.email} (${u.name || "—"}) role=${u.role}${u.adminRole ? ` ${u.adminRole}` : ""}`,
    ),
  )
  console.log()

  if (isDryRun) {
    console.log("DRY RUN — no changes.")
    return
  }

  if (confirm !== REQUIRED_CONFIRM) {
    console.error(`Refusing to run: pass --confirm ${REQUIRED_CONFIRM}`)
    console.error("Example: node -r dotenv/config scripts/wipe-all-users.js --confirm DELETE_ALL_USER_DATA --force")
    process.exit(1)
  }

  if (!force) {
    console.log("Starting in 10s (Ctrl+C to cancel)...")
    await new Promise((r) => setTimeout(r, 10000))
  }

  const userIds = allUsers.map((u) => u.id)
  const emails = [...new Set(allUsers.map((u) => u.email.toLowerCase()))]

  const deleted = await deleteUsersTransaction(prisma, userIds, emails)

  console.log("Deletion summary:")
  Object.entries(deleted).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log()

  const remaining = await prisma.user.count()
  console.log(`Remaining user rows: ${remaining}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
