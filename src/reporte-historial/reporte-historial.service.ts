import { prisma } from '../lib/prisma';
import { reporteHistorialRepository } from './reporte-historial.repository';
import { FiltrosHistorialInput } from './reporte-historial.schema';

async function getReporteOr404(reporteId: number) {
  const reporte = await prisma.reporte.findFirst({
    where:  { id: reporteId, deletedAt: null },
    select: { id: true },
  });
  if (!reporte) {
    throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
  }
  return reporte;
}

export const reporteHistorialService = {
  getByReporte: async (reporteId: number, filtros: FiltrosHistorialInput) => {
    await getReporteOr404(reporteId);

    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    const [historial, total] = await Promise.all([
      reporteHistorialRepository.findByReporte(reporteId, skip, take),
      reporteHistorialRepository.count(reporteId),
    ]);

    return {
      data: historial,
      meta: {
        total,
        page:       filtros.page,
        limit:      filtros.limit,
        totalPages: Math.ceil(total / filtros.limit),
      },
    };
  },
};