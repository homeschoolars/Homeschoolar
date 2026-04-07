/**
 * Delete specific users by email (same FK cleanup as remove-non-admin-users.js).
 * Refuses to delete users with role=admin.
 *
 * Usage:
 *   node -r dotenv/config scripts/delete-users-by-email.js --dry-run email1@x.com email2@y.com
 *   node -r dotenv/config scripts/delete-users-by-email.js --force email1@x.com
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

function expandEmailVariants(raw) {
  const set = new Set()
  const e = raw.trim().toLowerCase()
  if (!e || !e.includes("@")) return []
  set.add(e)
  // common typo
  if (e.endsWith("@gamil.com")) set.add(e.replace("@gamil.com", "@gmail.com"))
  return [...set]
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"))
  const flags = process.argv.slice(2).filter((a) => a.startsWith("-"))
  const dry = flags.includes("--dry-run") || flags.includes("-d")
  const force = flags.includes("--force") || flags.includes("-y")

  if (args.length === 0) {
    console.error("Usage: node -r dotenv/config scripts/delete-users-by-email.js [--dry-run] [--force] email1 [email2 ...]")
    process.exit(1)
  }

  const searchEmails = [...new Set(args.flatMap(expandEmailVariants))]
  const orFilter = searchEmails.map((email) => ({
    email: { equals: email, mode: "insensitive" },
  }))

  const found = await prisma.user.findMany({
    where: { OR: orFilter },
    select: { id: true, email: true, name: true, role: true },
  })

  console.log("Lookup (case-insensitive; @gamil.com also tries @gmail.com):", searchEmails.join(", "))
  console.log()

  if (found.length === 0) {
    console.log("No matching users found.")
    return
  }

  found.forEach((u) => console.log(`Found: ${u.email} (${u.name || "—"}) role=${u.role}`))

  const admins = found.filter((u) => u.role === "admin")
  const toDelete = found.filter((u) => u.role !== "admin")

  if (admins.length) {
    console.log()
    console.log("Skipping admin account(s) (not deleted):", admins.map((a) => a.email).join(", "))
  }

  if (toDelete.length === 0) {
    console.log("Nothing to delete.")
    return
  }

  const nonAdminIds = toDelete.map((u) => u.id)
  const tokenIds = [...new Set([...searchEmails, ...toDelete.map((u) => u.email.toLowerCase())])]

  console.log()
  if (dry) {
    console.log("DRY RUN — would delete user id(s):", nonAdminIds.join(", "))
    return
  }

  if (!force) {
    console.log("Deleting in 3s (Ctrl+C to cancel)...")
    await new Promise((r) => setTimeout(r, 3000))
  }

  const summary = await deleteUsersTransaction(prisma, nonAdminIds, tokenIds)
  console.log("Deletion summary:")
  Object.entries(summary).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
