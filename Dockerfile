FROM node:20-bookworm-slim AS base

# Install openssl, ca-certificates, and curl for Prisma, TLS, and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 1: Install dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Dummy DB URL for prisma generate triggered during postinstall
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
RUN npm ci

# Step 2: Build the Next.js application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Ensure Prisma client is freshly generated for Linux environment
RUN npx prisma generate

# Build Next.js production bundle
RUN npm run build

# Step 3: Production runtime image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Copy runtime assets and dependencies with non-root ownership
COPY --chown=nextjs:nodejs --from=builder /app/package.json ./package.json
COPY --chown=nextjs:nodejs --from=builder /app/package-lock.json ./package-lock.json
COPY --chown=nextjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/.next ./.next
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=builder /app/eng.traineddata* ./

USER nextjs

EXPOSE 3000

# Health check to ensure the container is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/login || exit 1

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
