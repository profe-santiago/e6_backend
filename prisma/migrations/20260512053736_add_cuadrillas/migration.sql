-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('ASIGNADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "cuadrillas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "municipioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuadrillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_cuadrilla" (
    "id" SERIAL NOT NULL,
    "cuadrillaId" INTEGER NOT NULL,
    "reporteId" INTEGER NOT NULL,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'ASIGNADA',
    "nota" TEXT,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadaEn" TIMESTAMP(3),
    "completadaEn" TIMESTAMP(3),
    "asignadoPor" INTEGER NOT NULL,

    CONSTRAINT "asignaciones_cuadrilla_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cuadrillas" ADD CONSTRAINT "cuadrillas_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_cuadrilla" ADD CONSTRAINT "asignaciones_cuadrilla_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "cuadrillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_cuadrilla" ADD CONSTRAINT "asignaciones_cuadrilla_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reportes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_cuadrilla" ADD CONSTRAINT "asignaciones_cuadrilla_asignadoPor_fkey" FOREIGN KEY ("asignadoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
