#!/bin/sh
set -e
cd /app

PORT="${PORT:-8080}"

# Cloud Run sets PORT; listen on all interfaces (required for the platform probe).
if [ "${SKIP_DB_MIGRATE_ON_START:-}" = "true" ]; then
  echo "[entrypoint] SKIP_DB_MIGRATE_ON_START=true — skipping prisma migrate deploy"
else
  echo "[entrypoint] Running prisma migrate deploy..."
  node node_modules/prisma/build/index.js migrate deploy
fi

echo "[entrypoint] Starting Next.js on 0.0.0.0:${PORT}"
exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$PORT"
