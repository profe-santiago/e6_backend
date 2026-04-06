import { prisma } from '../lib/prisma';
import { reporteFotoRepository } from './reporte-foto.repository';
import { AddFotosInput } from './reporte-foto.schema';
import { JwtPayload } from '../auth/auth.types';

const MAX_FOTOS = 10;

/** Verifica que el reporte exista y no esté eliminado */
async function getReporteOr404(reporteId: number) {
  const reporte = await prisma.reporte.findFirst({
    where:  { id: reporteId, deletedAt: null },
    select: { id: true, usuarioId: true, estado: true },
  });
  if (!reporte) {
    throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
  }
  return reporte;
}

export const reporteFotoService = {
  getByReporte: async (reporteId: number) => {
    await getReporteOr404(reporteId);
    return reporteFotoRepository.findByReporte(reporteId);
  },

  add: async (reporteId: number, data: AddFotosInput, user: JwtPayload) => {
    const reporte = await getReporteOr404(reporteId);

    // Solo el autor o una autoridad pueden agregar fotos
    const esAutor     = reporte.usuarioId === user.sub;
    const esAutoridad = ['SUPER_ADMIN', 'ADMIN', 'COORDINADOR'].includes(user.rol);
    if (!esAutor && !esAutoridad) {
      throw Object.assign(
        new Error('Solo puedes agregar fotos a tus propios reportes'),
        { statusCode: 403 }
      );
    }

    // No se pueden agregar fotos a reportes cerrados
    if (['RESUELTO', 'RECHAZADO'].includes(reporte.estado)) {
      throw Object.assign(
        new Error('No se pueden agregar fotos a reportes resueltos o rechazados'),
        { statusCode: 400 }
      );
    }

    // Valida que no se supere el límite global
    const actual = await reporteFotoRepository.countByReporte(reporteId);
    if (actual + data.urls.length > MAX_FOTOS) {
      throw Object.assign(
        new Error(`Un reporte puede tener máximo ${MAX_FOTOS} fotos (actualmente tiene ${actual})`),
        { statusCode: 400 }
      );
    }

    await reporteFotoRepository.addMany(reporteId, data.urls);
    return reporteFotoRepository.findByReporte(reporteId);
  },

  delete: async (reporteId: number, fotoId: number, user: JwtPayload) => {
    await getReporteOr404(reporteId);

    const foto = await reporteFotoRepository.findById(fotoId);
    if (!foto) {
      throw Object.assign(new Error('Foto no encontrada'), { statusCode: 404 });
    }
    if (foto.reporteId !== reporteId) {
      throw Object.assign(
        new Error('La foto no pertenece a este reporte'),
        { statusCode: 400 }
      );
    }

    // Solo el autor o una autoridad pueden eliminar fotos
    const reporte    = await prisma.reporte.findUnique({
      where:  { id: reporteId },
      select: { usuarioId: true },
    });
    const esAutor     = reporte?.usuarioId === user.sub;
    const esAutoridad = ['SUPER_ADMIN', 'ADMIN', 'COORDINADOR'].includes(user.rol);
    if (!esAutor && !esAutoridad) {
      throw Object.assign(
        new Error('Solo puedes eliminar fotos de tus propios reportes'),
        { statusCode: 403 }
      );
    }

    await reporteFotoRepository.deleteById(fotoId);
    return { message: 'Foto eliminada correctamente' };
  },
};