# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencias primero (mejor caché de capas)
COPY package*.json prisma.config.ts ./
COPY prisma/ ./prisma/

RUN npm install

# Genera el cliente Prisma con los tipos correctos
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

# Compila el código fuente principal
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# pg_isready para esperar a la base de datos en el entrypoint
RUN apk add --no-cache postgresql-client

# Solo dependencias de producción
COPY package*.json prisma.config.ts ./
COPY prisma/ ./prisma/

RUN npm install --omit=dev
RUN npm install tsx

# Trae el cliente Prisma generado desde el builder
COPY --from=builder /app/node_modules/.prisma          ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client   ./node_modules/@prisma/client

# Build compilado (incluye dist/prisma/create-superadmin.js)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src  ./src  

# Directorios para archivos subidos por usuarios
RUN mkdir -p uploads/reports uploads/avatars

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]