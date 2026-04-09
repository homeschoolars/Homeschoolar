FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY scripts ./scripts
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate validates datasource URL; no DB connection is made during generate.
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public"
RUN pnpm build \
  && rm -rf .next/cache \
  && pnpm exec prisma generate
# pnpm may place .prisma under node_modules/.prisma or nested under @prisma/client; standalone trace still omits it.
RUN mkdir -p .next/standalone/node_modules \
  && if [ -d node_modules/.prisma ]; then \
       cp -rL node_modules/.prisma .next/standalone/node_modules/.prisma; \
     elif [ -d node_modules/@prisma/client/node_modules/.prisma ]; then \
       cp -rL node_modules/@prisma/client/node_modules/.prisma .next/standalone/node_modules/.prisma; \
     else \
       P="$(find node_modules -type d -name .prisma 2>/dev/null | head -n1)"; \
       if [ -z "$P" ]; then echo "ERROR: no .prisma directory after prisma generate"; ls -la node_modules | head -40; exit 1; fi; \
       cp -rL "$P" .next/standalone/node_modules/.prisma; \
     fi \
  && cp -rL node_modules/@prisma/client .next/standalone/node_modules/@prisma/client

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# TLS to managed Postgres (e.g. Neon) for Prisma at runtime
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m -u 1001 nodejs

COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Standalone trace (next.config output: "standalone") — smaller runtime tree than full node_modules.
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Bootstrap HOSTNAME before Next's generated server.js reads process.env (see scripts/cloud-run-server.cjs).
COPY scripts/cloud-run-server.cjs /app/cloud-run-server.cjs

RUN rm -f /app/.env /app/.env.local /app/.env.production /app/.env.development 2>/dev/null || true \
  && chown nodejs:nodejs /app/cloud-run-server.cjs

USER nodejs
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
