/**
 * Script to make a user an admin
 * Usage: node scripts/make-admin.js <email> [adminRole]
 * 
 * Examples:
 *   node scripts/make-admin.js admin@example.com
 *   node scripts/make-admin.js admin@example.com super_admin
 */

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function makeAdmin(email, adminRole = "super_admin") {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    if (user.role === "admin") {
      console.log(`ℹ️  User "${email}" is already an admin`)
      if (user.adminRole === adminRole) {
        console.log(`ℹ️  Admin role is already "${adminRole}"`)
        return
      }
    }

    const updated = await prisma.user.update({
      where: { email },
      data: {
        role: "admin",
        adminRole: adminRole,
      },
    })

    console.log(`✅ Successfully set user "${email}" as admin`)
    console.log(`   Role: ${updated.role}`)
    console.log(`   Admin Role: ${updated.adminRole}`)
    console.log(`\n📝 You can now log in and access /admin dashboard`)
  } catch (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]
const adminRole = process.argv[3] || "super_admin"

if (!email) {
  console.error("❌ Usage: node scripts/make-admin.js <email> [adminRole]")
  console.error("   Example: node scripts/make-admin.js admin@example.com super_admin")
  process.exit(1)
}

const validAdminRoles = ["super_admin", "content_admin", "support_admin", "finance_admin"]
if (!validAdminRoles.includes(adminRole)) {
  console.error(`❌ Invalid admin role. Must be one of: ${validAdminRoles.join(", ")}`)
  process.exit(1)
}

makeAdmin(email, adminRole)
