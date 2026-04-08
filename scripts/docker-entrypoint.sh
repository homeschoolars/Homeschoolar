#!/bin/sh
set -e
cd /app

# Cloud Run sets PORT (usually 8080).
export PORT="${PORT:-8080}"

# Next standalone server.js uses process.env.HOSTNAME for listen(). On Linux,
# HOSTNAME is the container hostname (not 0.0.0.0), which breaks Cloud Run probes.
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

echo "[entrypoint] Next standalone PORT=${PORT} HOSTNAME=${HOSTNAME}"
exec node server.js
