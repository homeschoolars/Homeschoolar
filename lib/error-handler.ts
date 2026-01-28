/**
 * Global error handlers for unhandled promise rejections and exceptions
 * 
 * Cloud Run Considerations:
 * - Unhandled promise rejections can crash the container
 * - Need to log errors for debugging
 * - Should gracefully degrade instead of crashing
 */

/**
 * Setup global error handlers
 * Call this once at application startup
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    console.error("[Unhandled Rejection] Promise rejection was not handled:", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: String(promise),
    })
    
    // In production, we might want to:
    // 1. Send to error tracking service (Sentry, etc.)
    // 2. Gracefully shutdown
    // 3. Return error response instead of crashing
    
    // For now, log and continue (Cloud Run will restart if needed)
  })

  // Handle uncaught exceptions
  process.on("uncaughtException", (error: Error) => {
    console.error("[Uncaught Exception] Unhandled exception:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    // In production, we should:
    // 1. Log to error tracking service
    // 2. Attempt graceful shutdown
    // 3. Let Cloud Run restart the container
    
    // For now, log and exit (Cloud Run will restart)
    process.exit(1)
  })

  // Handle warnings (can indicate potential issues)
  process.on("warning", (warning: Error) => {
    console.warn("[Process Warning]:", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    })
  })
}

/**
 * Wrap async route handlers with error boundary
 * 
 * @param handler - Async route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorBoundary<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error: unknown) {
      // Log error
      console.error("[Error Boundary] Unhandled error in route handler:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Return safe error response
      return Response.json(
        { error: "An unexpected error occurred. Please try again." },
        { status: 500 }
      ) as ReturnType<T>
    }
  }) as T
}

/**
 * Safe async wrapper that never throws
 * 
 * @param fn - Async function to execute
 * @param fallback - Fallback value if function throws
 * @returns Result or fallback
 */
export async function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error("[Safe Async] Error:", error)
    return fallback
  }
}
