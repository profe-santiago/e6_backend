import { prisma } from "../lib/prisma";
import { AppError } from "../lib/app-error";
import { reporteFotoRepository } from "./reporte-foto.repository";
import { TokenPayload } from "../auth/auth.types";

const MAX_FOTOS = 10;

async function getReporteOr404(reporteId: number) {
  const reporte = await prisma.reporte.findFirst({
    where: { id: reporteId, deletedAt: null },
    select: { id: true, usuarioId: true, estado: true },
  });
  if (!reporte) throw new AppError(404, "Reporte no encontrado");
  return reporte;
}

export const reporteFotoService = {
  getByReporte: async (reporteId: number) => {
    await getReporteOr404(reporteId);
    return reporteFotoRepository.findByReporte(reporteId);
  },

  add: async (
    reporteId: number,
    files: Express.Multer.File[],
    user?: TokenPayload,
  ) => {
    const reporte = await getReporteOr404(reporteId);
    const reporteEsAnonimo = reporte.usuarioId === null;

    if (!reporteEsAnonimo) {
      const esAutor = user?.sub === reporte.usuarioId;
      const esAutoridad = user
        ? ["SUPER_ADMIN", "ADMIN", "COORDINADOR"].includes(user.rol)
        : false;

      if (!esAutor && !esAutoridad) {
        throw new AppError(403, "Solo puedes agregar fotos a tus propios reportes");
      }
    }

    if (["RESUELTO", "RECHAZADO"].includes(reporte.estado)) {
      throw new AppError(400, "No se pueden agregar fotos");
    }

    const actual = await reporteFotoRepository.countByReporte(reporteId);

    if (actual + files.length > MAX_FOTOS) {
      throw new AppError(400, `Máximo ${MAX_FOTOS} fotos`);
    }

    const urls = files.map((file) => `/uploads/reports/${file.filename}`);
    await reporteFotoRepository.addMany(reporteId, urls);
    return reporteFotoRepository.findByReporte(reporteId);
  },

  delete: async (reporteId: number, fotoId: number, user: TokenPayload) => {
    await getReporteOr404(reporteId);

    const foto = await reporteFotoRepository.findById(fotoId);
    if (!foto) throw new AppError(404, "Foto no encontrada");
    if (foto.reporteId !== reporteId)
      throw new AppError(400, "La foto no pertenece a este reporte");

    const reporte = await prisma.reporte.findUnique({
      where: { id: reporteId },
      select: { usuarioId: true },
    });
    const esAutor = reporte?.usuarioId === user.sub;
    const esAutoridad = ["SUPER_ADMIN", "ADMIN", "COORDINADOR"].includes(user.rol);

    if (!esAutor && !esAutoridad) {
      throw new AppError(403, "Solo puedes eliminar fotos de tus propios reportes");
    }

    await reporteFotoRepository.deleteById(fotoId);
    return { message: "Foto eliminada correctamente" };
  },
};