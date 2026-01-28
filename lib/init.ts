/**
 * Application initialization
 * 
 * This file sets up global error handlers and other initialization logic
 * that should run when the application starts.
 */

import { setupGlobalErrorHandlers } from "./error-handler"

// Setup global error handlers on module load
if (typeof process !== "undefined") {
  setupGlobalErrorHandlers()
  
  // Log initialization
  if (process.env.NODE_ENV === "production") {
    console.log("[Init] Global error handlers initialized")
  }
}
