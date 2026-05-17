#!/bin/sh
set -e

DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "🔍 Esperando a PostgreSQL en ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
  echo "   PostgreSQL no disponible — reintentando en 2s..."
  sleep 2
done
echo "✅ PostgreSQL disponible."

echo "📦 Aplicando migraciones Prisma..."
npx prisma migrate deploy
echo "✅ Migraciones aplicadas."

echo "👤 Creando SUPER_ADMIN inicial..."
npx tsx prisma/create-superadmin.ts || echo "ℹ  SUPER_ADMIN ya existe, omitiendo..."

if [ "${SEED_DATA:-false}" = "true" ]; then
  echo "🌱 Cargando datos geográficos INEGI/SEPOMEX (puede tardar varios minutos)..."
  npm run seed
  echo "✅ Seed completado."
fi

echo "🚀 Iniciando servidor..."
exec "$@"