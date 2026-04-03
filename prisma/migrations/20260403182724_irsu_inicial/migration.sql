-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'COORDINADOR', 'USUARIO');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('INFRAESTRUCTURA', 'VIALIDAD', 'BLOQUEOS', 'SEGURIDAD');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "FuenteReporte" AS ENUM ('APP_MOVIL', 'WEB', 'TWITTER', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "EstadoComunidad" AS ENUM ('PENDIENTE', 'ACTIVO', 'RECHAZADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "NivelAlerta" AS ENUM ('AMARILLA', 'ROJA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ACTIVA', 'EN_ATENCION', 'CERRADA');

-- CreateTable
CREATE TABLE "estados" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "clave" CHAR(2) NOT NULL,

    CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "clave" CHAR(5) NOT NULL,
    "estadoId" INTEGER NOT NULL,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_postales" (
    "id" SERIAL NOT NULL,
    "codigo" CHAR(5) NOT NULL,
    "colonia" VARCHAR(200) NOT NULL,
    "municipioId" INTEGER NOT NULL,

    CONSTRAINT "codigos_postales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunidades" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(250) NOT NULL,
    "status" "EstadoComunidad" NOT NULL DEFAULT 'PENDIENTE',
    "irsuActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    "logoUrl" TEXT,
    "municipioId" INTEGER NOT NULL,
    "cpId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comunidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" VARCHAR(100),
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "municipioId" INTEGER,
    "comunidadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "gravedad" INTEGER NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "estado" "EstadoReporte" NOT NULL DEFAULT 'PENDIENTE',
    "fuente" "FuenteReporte" NOT NULL DEFAULT 'APP_MOVIL',
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "deviceIp" VARCHAR(45),
    "sincronizado" BOOLEAN NOT NULL DEFAULT true,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "usuarioId" INTEGER,
    "comunidadId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_fotos" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "reporteId" INTEGER NOT NULL,

    CONSTRAINT "reporte_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "reporteId" INTEGER NOT NULL,

    CONSTRAINT "votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_historial" (
    "id" SERIAL NOT NULL,
    "reporteId" INTEGER NOT NULL,
    "cambiadoPor" INTEGER NOT NULL,
    "estadoAnterior" "EstadoReporte",
    "estadoNuevo" "EstadoReporte" NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" SERIAL NOT NULL,
    "comunidadId" INTEGER NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "nivel" "NivelAlerta" NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ACTIVA',
    "irsuValor" DOUBLE PRECISION NOT NULL,
    "asignadoA" INTEGER,
    "atendidaEn" TIMESTAMP(3),
    "cerradaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "irsu_historial" (
    "id" SERIAL NOT NULL,
    "comunidadId" INTEGER NOT NULL,
    "categoria" "Categoria",
    "valor" DOUBLE PRECISION NOT NULL,
    "totalReportes" INTEGER NOT NULL,
    "gravedadPromedio" DOUBLE PRECISION NOT NULL,
    "tendencia" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "irsu_historial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_clave_key" ON "estados"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "municipios_clave_key" ON "municipios"("clave");

-- CreateIndex
CREATE INDEX "codigos_postales_codigo_idx" ON "codigos_postales"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "comunidades_slug_key" ON "comunidades"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "comunidades_municipioId_nombre_key" ON "comunidades"("municipioId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "votos_usuarioId_reporteId_key" ON "votos"("usuarioId", "reporteId");

-- AddForeignKey
ALTER TABLE "municipios" ADD CONSTRAINT "municipios_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_postales" ADD CONSTRAINT "codigos_postales_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunidades" ADD CONSTRAINT "comunidades_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunidades" ADD CONSTRAINT "comunidades_cpId_fkey" FOREIGN KEY ("cpId") REFERENCES "codigos_postales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_fotos" ADD CONSTRAINT "reporte_fotos_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reportes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reportes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_historial" ADD CONSTRAINT "reporte_historial_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reportes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_historial" ADD CONSTRAINT "reporte_historial_cambiadoPor_fkey" FOREIGN KEY ("cambiadoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_asignadoA_fkey" FOREIGN KEY ("asignadoA") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "irsu_historial" ADD CONSTRAINT "irsu_historial_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
