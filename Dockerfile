# syntax=docker/dockerfile:1

##### 1. deps — install dependencies only (cached separately from source) #####
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

##### 2. builder — build the Next.js app #####
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time,
# so they must be passed as build args, not just runtime env vars.
ARG NEXT_PUBLIC_API_BASE=http://localhost:8000
ARG NEXT_PUBLIC_LK_URL=ws://localhost:7880
# src/lib/supabase.ts throws at build time if these are unset, which
# breaks static prerendering of /auth/callback. Placeholders keep the
# build green when no real project is configured yet — auth won't
# actually work until you pass real values (see .env.example).
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_LK_URL=$NEXT_PUBLIC_LK_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

##### 3. runner — minimal production image #####
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5173
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# `output: "standalone"` (set in next.config.mjs) traces only the
# files needed to run the app, so the final image doesn't need
# node_modules or the full source tree.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# This repo currently has no public/ dir — copy it only if present,
# so the build doesn't fail if one gets added later either way.
COPY --from=builder --chown=nextjs:nodejs /app/public* ./public

USER nextjs
EXPOSE 5173

CMD ["node", "server.js"]