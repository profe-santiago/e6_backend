-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "avatarUrl" VARCHAR(500);

-- CreateTable
CREATE TABLE "usuario_comunidades" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "comunidadId" INTEGER NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_comunidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_comunidades_usuarioId_comunidadId_key" ON "usuario_comunidades"("usuarioId", "comunidadId");

-- AddForeignKey
ALTER TABLE "usuario_comunidades" ADD CONSTRAINT "usuario_comunidades_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_comunidades" ADD CONSTRAINT "usuario_comunidades_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
