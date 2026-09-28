# MegaMart client (Next.js standalone) — multi-stage build.
# Stage runner chỉ chứa bundle standalone (~340MB thay vì >1.5GB source build).

# ---------- deps: cài dependencies (tận dụng cache layer) ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall của repo copy maplibre worker vào public/ -> cần public/ tồn tại
COPY public ./public
RUN npm install --legacy-peer-deps && npm cache clean --force

# ---------- builder: build Next.js ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* được bake vào bundle lúc build -> truyền qua --build-arg ở CI.
# Giá trị mặc định để build local không gãy (CD sẽ override bằng domain thật).
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner: image production ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
