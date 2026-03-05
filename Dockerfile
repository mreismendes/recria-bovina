# ── Build stage (Debian, same family as runner) ────────────────
FROM node:20-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Verify migrations exist in builder
RUN echo "=== Builder prisma contents ===" && ls -R prisma/migrations/

# ── Production stage ──────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. Copy standalone app first
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 2. Copy Prisma engine + CLI
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 3. Force-copy the FULL prisma folder LAST (overwrites any partial copy from standalone)
COPY --from=builder /app/prisma/ ./prisma/

# Verify at build time
RUN echo "=== Runner prisma contents ===" && ls -R prisma/migrations/

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "-c", "echo '>>> Contents of prisma/migrations:' && ls -R prisma/migrations/ && echo '>>> Running migrations...' && node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma && echo '>>> Migrations done' && exec node server.js"]
