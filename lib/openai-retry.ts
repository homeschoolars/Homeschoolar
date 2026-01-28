import "server-only"

/**
 * Retry configuration for OpenAI API calls
 * 
 * Cloud Run Considerations:
 * - Network issues can cause transient failures
 * - Rate limits can be temporary
 * - Timeouts need retry logic
 */
export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  retryableStatusCodes?: number[]
  retryableErrors?: string[]
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatusCodes: [429, 500, 502, 503, 504],
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "timeout", "rate limit"],
}

/**
 * Retry wrapper for async functions with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function call
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error
      const err = error as { status?: number; code?: string; message?: string }

      // Check if error is retryable
      const isRetryable =
        (err.status && config.retryableStatusCodes.includes(err.status)) ||
        (err.code && config.retryableErrors.some((pattern) => err.code?.includes(pattern))) ||
        (err.message && config.retryableErrors.some((pattern) => err.message?.toLowerCase().includes(pattern)))

      // Don't retry on last attempt or non-retryable errors
      if (attempt === config.maxRetries || !isRetryable) {
        throw error
      }

      // Calculate exponential backoff delay
      const delay = config.retryDelay * Math.pow(2, attempt)
      console.warn(
        `[OpenAI Retry] Attempt ${attempt + 1}/${config.maxRetries + 1} failed, retrying in ${delay}ms:`,
        err.message || err.code || "unknown error"
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Check if an error is a JSON schema validation error
 */
export function isSchemaValidationError(error: unknown): boolean {
  const err = error as { status?: number; message?: string; code?: string }
  return (
    err.status === 400 &&
    (err.message?.toLowerCase().includes("schema") ||
      err.message?.toLowerCase().includes("validation") ||
      err.message?.toLowerCase().includes("invalid json") ||
      err.code === "invalid_json")
  )
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  const err = error as { status?: number; message?: string }
  return (
    err.status === 429 ||
    (err.message?.toLowerCase().includes("rate limit") ?? false) ||
    (err.message?.toLowerCase().includes("quota") ?? false)
  )
}
