# Admin Dashboard Access Guide

## How to Access Admin Dashboard

The admin dashboard is located at `/admin` route. To access it, you need:

1. **A user account** (created via signup)
2. **Admin role** set in the database
3. **Login** with that account

## Methods to Set a User as Admin

### Method 1: Using the Script (Recommended)

Run the script to make any user an admin:

```bash
node scripts/make-admin.js <email> [adminRole]
```

**Examples:**
```bash
# Make user admin with super_admin role (default)
node scripts/make-admin.js admin@example.com

# Make user admin with specific role
node scripts/make-admin.js admin@example.com super_admin
node scripts/make-admin.js content@example.com content_admin
```

**Available Admin Roles:**
- `super_admin` - Full access (default)
- `content_admin` - Content management access
- `support_admin` - Support and user management
- `finance_admin` - Financial operations access

### Method 2: Using API Endpoint (Development Only)

**⚠️ Warning:** This endpoint should be secured or removed in production.

```bash
# Set ADMIN_SETUP_SECRET in your .env file first
curl -X POST http://localhost:3000/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"email": "admin@example.com", "admin_role": "super_admin"}'
```

### Method 3: Direct Database Update

If you have direct database access:

```sql
-- Update user role to admin
UPDATE profiles 
SET role = 'admin', admin_role = 'super_admin' 
WHERE email = 'admin@example.com';
```

Or using Prisma Studio:
```bash
npx prisma studio
```
Then navigate to `profiles` table and update:
- `role` → `admin`
- `admin_role` → `super_admin`

## After Setting Admin Role

1. **Log out** if you're currently logged in (to refresh session)
2. **Log in** again with the admin email
3. You'll be automatically redirected to `/admin` dashboard

## Admin Dashboard Features

Once you have admin access, you can:

- **Overview** - System statistics and metrics
- **Users** - Manage all users
- **Content** - Manage worksheets, videos, quizzes
- **AI Usage** - Monitor AI feature usage
- **Analytics** - Learning analytics
- **Flags** - Low-performing students
- **Blog** - Manage blog posts
- **News** - Manage child-friendly news panel
- **Subscriptions** - Manage user subscriptions
- **Orphans** - Review orphan verification requests
- **PKR Payments** - Verify PKR payments

## Security Notes

- Admin routes are protected with `requireRole("admin")` checks
- Some admin features require specific `adminRole` (e.g., `super_admin` for refunds)
- Always use strong passwords for admin accounts
- Consider removing the `/api/admin/make-admin` endpoint in production
- Use the script method for production setups
