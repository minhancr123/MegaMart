# MegaMart server (NestJS) — multi-stage build.
# Runner chỉ chứa dependencies runtime + dist (không source/test/devDeps).
# Lưu ý: image ~850MB vì runtime deps nặng sẵn (langchain/openai/OTel) +
# Prisma engines; muốn gọn hơn nữa thì audit bỏ AI deps khỏi prod.

# ---------- prod-deps: chỉ dependencies runtime ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- builder: generate Prisma + build ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---------- runner: image production ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat \
 && addgroup --system --gid 1001 nestjs \
 && adduser --system --uid 1001 nestjs
COPY --from=prod-deps /app/node_modules ./node_modules
# Prisma Client đã generate (nằm ở node_modules/.prisma) — bắt buộc copy riêng
# vì stage prod-deps chưa chạy `prisma generate`.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
# Giữ prisma/ (schema + migrations) để migrate deploy tham chiếu --schema.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
USER nestjs
EXPOSE 3001
CMD ["node", "dist/src/main"]
