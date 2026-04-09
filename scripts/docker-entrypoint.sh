#!/bin/sh
set -e
cd /app

# Cloud Run injects PORT (default 8080). Next.js also reads PORT via the CLI; we pass -p explicitly.
PORT="${PORT:-8080}"
export PORT

if [ ! -x ./node_modules/.bin/next ]; then
  echo "[entrypoint] ERROR: ./node_modules/.bin/next missing — image build or prune may be wrong."
  exit 1
fi

# Bind 0.0.0.0 so the platform health checks can reach the process (not localhost-only).
echo "[entrypoint] next start PORT=${PORT} cwd=$(pwd)"
exec ./node_modules/.bin/next start -p "$PORT" -H 0.0.0.0
