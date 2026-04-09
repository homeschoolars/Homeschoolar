#!/bin/sh
set -e
cd /app

# Cloud Run injects PORT (default 8080). Next.js also reads PORT via the CLI; we pass -p explicitly.
PORT="${PORT:-8080}"
export PORT
export TMPDIR="${TMPDIR:-/tmp}"

# pnpm's node_modules/.bin/next is a shell shim that can embed NODE_PATH from the build machine;
# run Next's CLI with node directly to avoid a broken shim blocking startup.
unset NODE_PATH

# Cloud Run sets HOSTNAME to the instance id; some stacks treat HOSTNAME as the bind address.
unset HOSTNAME

NEXT_CLI="./node_modules/next/dist/bin/next"
if [ ! -f "$NEXT_CLI" ]; then
  echo "[entrypoint] ERROR: $NEXT_CLI missing — image build or copy may be wrong."
  exit 1
fi

# Bind 0.0.0.0 so platform health checks can reach the process (not localhost-only).
echo "[entrypoint] node $(node -v) next start PORT=${PORT} cwd=$(pwd)"
exec node "$NEXT_CLI" start -p "$PORT" -H 0.0.0.0
