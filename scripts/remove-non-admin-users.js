/**
 * Remove all users except those with role `admin`, including subscription and payment rows
 * tied to those users. Child profiles and all child-scoped data cascade from parent User deletion.
 *
 * WARNING: Irreversible. Back up the database first.
 *
 * Usage:
 *   node -r dotenv/config scripts/remove-non-admin-users.js --dry-run
 *   node -r dotenv/config scripts/remove-non-admin-users.js --force   # skip 5s countdown
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

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run") || args.includes("-d")
  const force = args.includes("--force") || args.includes("-y")

  console.log("=".repeat(60))
  console.log("Remove non-admin users (full data wipe for those accounts)")
  console.log("=".repeat(60))
  console.log()

  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, name: true, adminRole: true, createdAt: true },
    })

    if (adminUsers.length === 0) {
      console.error("Refusing to run: no users with role=admin found. Promote an admin first.")
      process.exit(1)
    }

    console.log(`Preserving ${adminUsers.length} admin user(s):`)
    adminUsers.forEach((u) => {
      console.log(`  - ${u.email} (${u.name || "No name"})${u.adminRole ? ` [${u.adminRole}]` : ""}`)
    })
    console.log()

    const nonAdminUsers = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    if (nonAdminUsers.length === 0) {
      console.log("No non-admin users found. Nothing to delete.")
      return
    }

    const byRole = nonAdminUsers.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    }, {})
    console.log(`Found ${nonAdminUsers.length} non-admin user(s) to delete:`)
    Object.entries(byRole).forEach(([role, count]) => console.log(`  - ${count} × ${role}`))
    console.log()
    console.log("Sample (first 10):")
    nonAdminUsers.slice(0, 10).forEach((u) => console.log(`  - ${u.email} (${u.name || "—"})`))
    if (nonAdminUsers.length > 10) console.log(`  ... +${nonAdminUsers.length - 10} more`)
    console.log()

    if (isDryRun) {
      console.log("DRY RUN — no changes.")
      return
    }

    if (!force) {
      console.log("Starting in 5s (Ctrl+C to cancel)...")
      await new Promise((r) => setTimeout(r, 5000))
    }

    const nonAdminIds = nonAdminUsers.map((u) => u.id)
    const emails = nonAdminUsers.map((u) => u.email.toLowerCase())

    const deleted = await deleteUsersTransaction(prisma, nonAdminIds, emails)

    console.log("Deletion summary:")
    Object.entries(deleted).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
    console.log()

    const remaining = await prisma.user.findMany({
      select: { email: true, name: true, role: true, adminRole: true },
      orderBy: { email: "asc" },
    })
    console.log("Remaining users:")
    remaining.forEach((u) =>
      console.log(`  - ${u.email} (${u.name || "—"}) role=${u.role}${u.adminRole ? ` ${u.adminRole}` : ""}`),
    )
  } catch (error) {
    console.error("Error:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(() => process.exit(1))
