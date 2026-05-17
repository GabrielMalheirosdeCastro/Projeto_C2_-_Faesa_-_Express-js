# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────
# Stage 1 — build TypeScript
# ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Dependências nativas do better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2 — runtime mínimo
# ──────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3050

# libstdc++ necessário em runtime para o binding nativo
RUN apk add --no-cache libstdc++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Volume persistente para o SQLite no EasyPanel
VOLUME ["/app/prisma"]

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://localhost:3050/healthz || exit 1

# Aplica migrations e sobe o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
