/**
 * Script to create an admin user or make existing user admin
 * Usage: node scripts/create-admin-user.js <email> <password> [adminRole]
 * 
 * Examples:
 *   node scripts/create-admin-user.js admin@example.com MySecurePass123
 *   node scripts/create-admin-user.js admin@example.com MySecurePass123 super_admin
 */

const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
require("dotenv").config()

const prisma = new PrismaClient()

async function createOrMakeAdmin(email, password, adminRole = "super_admin") {
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      // User exists - update to admin
      console.log(`ℹ️  User "${email}" already exists. Updating to admin...`)
      
      const passwordHash = await bcrypt.hash(password, 10)
      
      const updated = await prisma.user.update({
        where: { email },
        data: {
          role: "admin",
          adminRole: adminRole,
          passwordHash: passwordHash, // Update password
          emailVerified: new Date(), // Verify email for admin
        },
      })

      console.log(`✅ Successfully updated user "${email}" to admin`)
      console.log(`   Role: ${updated.role}`)
      console.log(`   Admin Role: ${updated.adminRole}`)
      console.log(`   Password: Updated`)
      console.log(`\n📝 You can now log in and access /admin dashboard`)
    } else {
      // User doesn't exist - create new admin user
      console.log(`ℹ️  Creating new admin user "${email}"...`)
      
      const passwordHash = await bcrypt.hash(password, 10)
      
      const created = await prisma.user.create({
        data: {
          email,
          name: "Admin User",
          role: "admin",
          adminRole: adminRole,
          passwordHash: passwordHash,
          emailVerified: new Date(), // Auto-verify for admin
        },
      })

      console.log(`✅ Successfully created admin user "${email}"`)
      console.log(`   Role: ${created.role}`)
      console.log(`   Admin Role: ${created.adminRole}`)
      console.log(`   Email Verified: Yes`)
      console.log(`\n📝 You can now log in and access /admin dashboard`)
      console.log(`\n🔐 Login Credentials:`)
      console.log(`   Email: ${email}`)
      console.log(`   Password: ${password}`)
    }
  } catch (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]
const password = process.argv[3]
const adminRole = process.argv[4] || "super_admin"

if (!email || !password) {
  console.error("❌ Usage: node scripts/create-admin-user.js <email> <password> [adminRole]")
  console.error("   Example: node scripts/create-admin-user.js admin@example.com MySecurePass123 super_admin")
  process.exit(1)
}

const validAdminRoles = ["super_admin", "content_admin", "support_admin", "finance_admin"]
if (!validAdminRoles.includes(adminRole)) {
  console.error(`❌ Invalid admin role. Must be one of: ${validAdminRoles.join(", ")}`)
  process.exit(1)
}

if (password.length < 6) {
  console.error("❌ Password must be at least 6 characters long")
  process.exit(1)
}

createOrMakeAdmin(email, password, adminRole)
