import { prisma } from '../lib/prisma';
import { ReporteHistorialItem } from './reporte-historial.types';

export const reporteHistorialRepository = {
  findByReporte: (reporteId: number, skip: number, take: number): Promise<ReporteHistorialItem[]> => {
    return prisma.reporteHistorial.findMany({
      where:  { reporteId },
      select: {
        id:             true,
        reporteId:      true,
        estadoAnterior: true,
        estadoNuevo:    true,
        nota:           true,
        createdAt:      true,
        usuario:        { select: { id: true, nombre: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  count: (reporteId: number): Promise<number> => {
    return prisma.reporteHistorial.count({ where: { reporteId } });
  },
};