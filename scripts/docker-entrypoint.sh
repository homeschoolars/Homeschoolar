#!/bin/sh
set -e
cd /app

# Cloud Run injects PORT (default 8080).
PORT="${PORT:-8080}"
export PORT
export TMPDIR="${TMPDIR:-/tmp}"

unset NODE_PATH

if [ ! -f ./cloud-run-server.cjs ]; then
  echo "[entrypoint] ERROR: ./cloud-run-server.cjs missing (see Dockerfile)."
  exit 1
fi

if [ ! -f ./server.js ]; then
  echo "[entrypoint] ERROR: ./server.js missing — build with output: \"standalone\" (see Dockerfile)."
  exit 1
fi

echo "[entrypoint] standalone node $(node -v) PORT=${PORT} pwd=$(pwd)"
exec node cloud-run-server.cjs
