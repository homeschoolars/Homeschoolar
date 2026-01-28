/**
 * Script to remove all users except admin users
 * 
 * WARNING: This will permanently delete all non-admin users and their associated data.
 * Make sure you have a database backup before running this script.
 * 
 * Usage:
 *   node scripts/remove-non-admin-users.js
 * 
 * To preview what will be deleted (dry run):
 *   node scripts/remove-non-admin-users.js --dry-run
 */

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run") || args.includes("-d")

  console.log("=".repeat(60))
  console.log("Remove Non-Admin Users Script")
  console.log("=".repeat(60))
  console.log()

  try {
    // First, get all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "admin",
      },
      select: {
        id: true,
        email: true,
        name: true,
        adminRole: true,
        createdAt: true,
      },
    })

    console.log(`Found ${adminUsers.length} admin user(s) that will be preserved:`)
    adminUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user.name || "No name"}) - Role: ${user.adminRole || "admin"}`)
    })
    console.log()

    // Get all non-admin users
    const nonAdminUsers = await prisma.user.findMany({
      where: {
        role: {
          not: "admin",
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    console.log(`Found ${nonAdminUsers.length} non-admin user(s) that will be deleted:`)
    if (nonAdminUsers.length > 0) {
      // Group by role
      const byRole = nonAdminUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {})

      Object.entries(byRole).forEach(([role, count]) => {
        console.log(`  - ${count} user(s) with role: ${role}`)
      })
      console.log()

      // Show first 10 users as examples
      console.log("Sample users to be deleted (first 10):")
      nonAdminUsers.slice(0, 10).forEach((user) => {
        console.log(`  - ${user.email} (${user.name || "No name"}) - Role: ${user.role}`)
      })
      if (nonAdminUsers.length > 10) {
        console.log(`  ... and ${nonAdminUsers.length - 10} more`)
      }
      console.log()
    } else {
      console.log("  No non-admin users found. Nothing to delete.")
      console.log()
      return
    }

    if (isDryRun) {
      console.log("=".repeat(60))
      console.log("DRY RUN MODE - No changes will be made")
      console.log("=".repeat(60))
      console.log()
      console.log(`Would delete ${nonAdminUsers.length} non-admin user(s)`)
      console.log(`Would preserve ${adminUsers.length} admin user(s)`)
      console.log()
      console.log("To actually delete these users, run without --dry-run flag:")
      console.log("  node scripts/remove-non-admin-users.js")
      return
    }

    // Confirm deletion
    console.log("=".repeat(60))
    console.log("WARNING: This will permanently delete all non-admin users!")
    console.log("=".repeat(60))
    console.log()
    console.log(`This will delete ${nonAdminUsers.length} user(s) and their associated data.`)
    console.log(`Admin users (${adminUsers.length}) will be preserved.`)
    console.log()
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...")
    console.log()

    // Wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000))

    console.log("Starting deletion...")
    console.log()

    // Delete non-admin users
    // Prisma will handle cascading deletes based on schema relationships
    const deleteResult = await prisma.user.deleteMany({
      where: {
        role: {
          not: "admin",
        },
      },
    })

    console.log("=".repeat(60))
    console.log("Deletion Complete!")
    console.log("=".repeat(60))
    console.log()
    console.log(`Deleted ${deleteResult.count} non-admin user(s)`)
    console.log(`Preserved ${adminUsers.length} admin user(s)`)
    console.log()

    // Verify remaining users
    const remainingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminRole: true,
      },
    })

    console.log("Remaining users in database:")
    remainingUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user.name || "No name"}) - Role: ${user.role}${user.adminRole ? ` (${user.adminRole})` : ""}`)
    })
    console.log()
  } catch (error) {
    console.error("Error:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error("Script failed:", error)
    process.exit(1)
  })
