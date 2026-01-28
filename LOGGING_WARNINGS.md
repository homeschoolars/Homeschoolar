# Logging and Warning Investigation Guide

## Common Warning Sources

Based on your codebase, here are the most common sources of WARNING-level logs:

### 1. Prisma Database Warnings
**Location**: `lib/prisma.ts`
```typescript
log: ["error", "warn"]
```

**Common Prisma Warnings:**
- Deprecated query patterns
- Slow queries (if query logging is enabled)
- Connection pool warnings
- Transaction warnings

**How to investigate:**
```bash
# View full Prisma logs in Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING AND jsonPayload.prisma" --limit 50
```

### 2. Missing Environment Variables

#### OpenAI API Key Warning
**Location**: `services/ai-service.ts:772`
```typescript
console.warn("[Assessment] OPENAI_API_KEY missing or placeholder...")
```

**Trigger**: When `OPENAI_API_KEY` is not set or is placeholder value

**Fix**: Ensure `OPENAI_API_KEY` is set in Cloud Run environment variables

#### Email Verification Warning
**Location**: `services/email-verification.ts:22`
```typescript
console.warn("[Email verification] RESEND_API_KEY not set...")
```

**Trigger**: When `RESEND_API_KEY` is not configured

**Fix**: Set `RESEND_API_KEY` in Cloud Run if email verification is needed

### 3. Roadmap Serialization Warnings
**Location**: `services/roadmap-service.ts:111`
```typescript
console.warn(`[Roadmap] Failed to serialize field, using fallback:`, error)
```

**Trigger**: When JSON serialization fails for learning profile data

**Impact**: Usually non-critical - falls back to empty object

## How to View Full Warning Messages

### Method 1: Google Cloud Console
1. Go to Cloud Run → Your Service → Logs
2. Filter by severity: `WARNING`
3. Click on a log entry to see full details

### Method 2: gcloud CLI
```bash
# View recent warnings
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING" --limit 20 --format=json

# View warnings with specific text
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING AND textPayload:\"OpenAI\"" --limit 20

# View warnings from last hour
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING AND timestamp>=\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" --limit 50
```

### Method 3: Structured Query
```bash
# View warnings with full payload
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING" \
  --format="table(timestamp,severity,textPayload,jsonPayload.message)" \
  --limit 20
```

## Reducing Warning Noise

### Option 1: Filter Expected Warnings
If certain warnings are expected (e.g., missing optional API keys), you can:
- Change `console.warn` to `console.log` for informational messages
- Use a logging library that supports log levels
- Filter in Cloud Logging

### Option 2: Adjust Prisma Logging
**File**: `lib/prisma.ts`

```typescript
// Only log errors in production
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  })
```

### Option 3: Suppress Specific Warnings
For known, non-critical warnings, you can wrap them:

```typescript
// Instead of console.warn
if (process.env.NODE_ENV === "development") {
  console.warn("[Email verification] RESEND_API_KEY not set...")
}
```

## Recommended Actions

1. **View the full warning message** using one of the methods above
2. **Identify the source** (Prisma, OpenAI, Email, etc.)
3. **Determine if it's critical**:
   - Missing API keys → Set environment variables
   - Prisma warnings → Review query patterns
   - Serialization warnings → Usually safe to ignore
4. **Take action** based on the specific warning

## Quick Check Commands

```bash
# Check if OpenAI is configured
curl https://your-app-url/api/health

# View recent warnings (last 10)
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING" --limit 10 --format="table(timestamp,textPayload)"

# Count warnings by type
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING" --format=json | jq -r '.[] | .textPayload // .jsonPayload.message // "unknown"' | sort | uniq -c | sort -rn
```

## Next Steps

To investigate your specific warning:
1. Run: `gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING AND insertId=\"697a3d7b000a328f8ad9e35f\"" --format=json`
2. Share the `textPayload` or `jsonPayload.message` field
3. I can help identify the exact issue and provide a fix
