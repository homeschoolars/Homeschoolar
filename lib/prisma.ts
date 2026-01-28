import { PrismaClient } from "@prisma/client"
import "@/lib/init" // Initialize global error handlers

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaInitialized?: boolean }

/**
 * Prisma Client with Cloud Run-optimized connection pooling
 * 
 * LAZY SINGLETON PATTERN:
 * - PrismaClient is NOT created at module import time (prevents build-time initialization)
 * - Only created when getPrismaClient() is first called at runtime
 * - Uses globalThis cache to prevent multiple instances
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
function getPrismaClient(): PrismaClient {
  // Return cached instance if available
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  // Check if we're in build phase - Next.js sets NEXT_PHASE during build
  // During build, DATABASE_URL is typically not available
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-build'

  // If we're in build time, throw a clear error to prevent Prisma initialization
  // This should only happen if code is incorrectly accessing Prisma at module import time
  if (isBuildTime) {
    throw new Error(
      "PrismaClient cannot be initialized during build time. " +
      "DATABASE_URL is not available during Next.js build. " +
      "Ensure Prisma is only accessed at runtime in API routes or server functions. " +
      "Make sure all API routes using Prisma have: export const dynamic = 'force-dynamic'"
    )
  }

  // Validate DATABASE_URL exists before creating client (runtime check)
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Please configure your database connection string."
    )
  }

  // Create new PrismaClient instance (lazy initialization)
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Cache in globalThis for reuse
  globalForPrisma.prisma = client

  // Setup graceful shutdown handlers (only once)
  if (!globalForPrisma.prismaInitialized && typeof process !== "undefined") {
    globalForPrisma.prismaInitialized = true
    
    const gracefulShutdown = async () => {
      console.log("[Prisma] Gracefully disconnecting...")
      if (globalForPrisma.prisma) {
        await globalForPrisma.prisma.$disconnect()
      }
    }
    
    process.on("SIGINT", gracefulShutdown)
    process.on("SIGTERM", gracefulShutdown)
    process.on("beforeExit", gracefulShutdown)
  }

  return client
}

/**
 * Lazy Prisma Client getter
 * 
 * IMPORTANT: This function is called lazily, NOT at module import time.
 * This prevents Prisma from initializing during Next.js build phase.
 * 
 * Usage:
 *   const prisma = getPrismaClient()
 *   await prisma.user.findMany()
 */
export function getPrisma(): PrismaClient {
  return getPrismaClient()
}

/**
 * Default export for convenience (lazy Proxy)
 * 
 * This is a Proxy that defers PrismaClient creation until first property access.
 * It only creates the client when actually used at runtime, not at import time.
 * 
 * During build, Next.js may evaluate modules but won't execute them. The Proxy
 * allows the module to be imported without initializing Prisma.
 * 
 * Usage:
 *   import { prisma } from "@/lib/prisma"
 *   await prisma.user.findMany()
 */
// Build-time mock to prevent Prisma initialization during Next.js build
function createBuildTimeMock(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      // Return a function that throws if called (should never happen during build)
      return () => {
        throw new Error(
          `PrismaClient.${String(prop)} cannot be used during build time. ` +
          "This route should have 'export const dynamic = \"force-dynamic\"'"
        )
      }
    },
  }) as PrismaClient
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    // Check if we're in build phase before trying to get client
    const isBuildTime = 
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NEXT_PHASE === 'phase-development-build'
    
    // During build, return a safe mock that won't crash module evaluation
    if (isBuildTime) {
      const mock = createBuildTimeMock()
      const value = (mock as unknown as Record<string, unknown>)[prop as string]
      return value
    }
    
    // At runtime, get the actual PrismaClient
    const client = getPrismaClient()
    const value = (client as unknown as Record<string, unknown>)[prop as string]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Note: Prisma 6 removed $use middleware in favor of $extends
// Connection retry logic is handled at the application level via error handling
// For connection pooling and retry, ensure DATABASE_URL includes proper pool settings
