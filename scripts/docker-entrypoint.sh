#!/bin/sh
set -e
cd /app

# Cloud Run injects PORT (default 8080).
PORT="${PORT:-8080}"
export PORT
export TMPDIR="${TMPDIR:-/tmp}"

# Cloud Run sets HOSTNAME to the revision/instance id. The standalone server uses HOSTNAME for
# listen(); a non-DNS name causes getaddrinfo ENOTFOUND and the process never binds PORT (TCP
# health checks fail). Force the bind address for the Node child process.
export HOSTNAME=0.0.0.0

unset NODE_PATH

if [ ! -f ./server.js ]; then
  echo "[entrypoint] ERROR: ./server.js missing — build with output: \"standalone\" and copy .next/standalone (see Dockerfile)."
  exit 1
fi

echo "[entrypoint] standalone node $(node -v) PORT=${PORT} HOSTNAME=${HOSTNAME} pwd=$(pwd)"
exec node server.js
