/**
 * Safe JSON parsing utilities to prevent runtime crashes
 */

/**
 * Safely parse JSON with fallback
 * 
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    console.error("[Safe JSON] Parse error:", error)
    return fallback
  }
}

/**
 * Safely stringify JSON with fallback
 * 
 * @param obj - Object to stringify
 * @param fallback - Fallback string if stringify fails
 * @returns JSON string or fallback
 */
export function safeJsonStringify(obj: unknown, fallback = "{}"): string {
  try {
    return JSON.stringify(obj)
  } catch (error) {
    console.error("[Safe JSON] Stringify error:", error)
    return fallback
  }
}

/**
 * Safely parse JSON from request body
 * 
 * @param request - Request object
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export async function safeParseRequestJson<T>(request: Request, fallback: T): Promise<T> {
  try {
    const text = await request.text()
    if (!text || text.trim().length === 0) {
      return fallback
    }
    return JSON.parse(text) as T
  } catch (error) {
    console.error("[Safe JSON] Request parse error:", error)
    return fallback
  }
}

/**
 * Validate and parse JSON with Zod schema
 * 
 * @param json - JSON string to parse
 * @param schema - Zod schema for validation
 * @returns Parsed and validated object
 * @throws Error if validation fails
 */
export function safeJsonParseWithSchema<T>(
  json: string,
  schema: { parse: (data: unknown) => T }
): T {
  try {
    const parsed = JSON.parse(json)
    return schema.parse(parsed)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JSON validation failed: ${error.message}`)
    }
    throw new Error("Invalid JSON format")
  }
}
