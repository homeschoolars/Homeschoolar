import { PrismaClient } from "@prisma/client"
import "@/lib/init" // Initialize global error handlers

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/**
 * Prisma Client with Cloud Run-optimized connection pooling
 * 
 * Connection Pool Configuration:
 * - connection_limit: Maximum number of connections per instance (Cloud Run default: 10)
 * - pool_timeout: Time to wait for connection (20s for Cloud Run)
 * - connect_timeout: Time to establish connection (10s)
 * 
 * Cloud Run Considerations:
 * - Each instance can handle multiple concurrent requests
 * - Connections are shared across requests
 * - Cold starts need fast connection establishment
 * - Connection leaks can exhaust the pool quickly
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Note: Prisma 6 removed $use middleware in favor of $extends
// Connection retry logic is handled at the application level via error handling
// For connection pooling and retry, ensure DATABASE_URL includes proper pool settings

// Graceful shutdown handler
if (typeof process !== "undefined") {
  const gracefulShutdown = async () => {
    console.log("[Prisma] Gracefully disconnecting...")
    await prisma.$disconnect()
  }
  
  process.on("SIGINT", gracefulShutdown)
  process.on("SIGTERM", gracefulShutdown)
  process.on("beforeExit", gracefulShutdown)
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
