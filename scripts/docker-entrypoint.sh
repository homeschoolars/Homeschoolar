#!/bin/sh
set -e
cd /app

# Cloud Run sets PORT (usually 8080).
export PORT="${PORT:-8080}"

# Next standalone uses process.env.HOSTNAME for listen(). Cloud Run/Kubernetes set
# HOSTNAME to the pod/instance id; ${HOSTNAME:-0.0.0.0} would keep that value and
# breaks HTTP startup probes. Always bind all interfaces.
export HOSTNAME="0.0.0.0"

echo "[entrypoint] Next standalone PORT=${PORT} HOSTNAME=${HOSTNAME}"
exec node server.js
