#!/bin/sh
set -e
cd /app

# Cloud Run sets PORT (usually 8080).
export PORT="${PORT:-8080}"

# Use `next start` (full node_modules) instead of standalone server.js — Next 16 standalone
# repeatedly failed to finish startup on Cloud Run (port never opened in time).
echo "[entrypoint] next start PORT=${PORT} cwd=$(pwd)"
exec ./node_modules/.bin/next start -p "$PORT" -H 0.0.0.0
