import { prisma } from '../lib/prisma';
import { ReporteFotoResponse } from './reporte-foto.types';

export const reporteFotoRepository = {
  findByReporte: (reporteId: number): Promise<ReporteFotoResponse[]> => {
    return prisma.reporteFoto.findMany({
      where:   { reporteId },
      select:  { id: true, url: true, reporteId: true },
      orderBy: { id: 'asc' },
    });
  },

  findById: (id: number): Promise<ReporteFotoResponse | null> => {
    return prisma.reporteFoto.findUnique({
      where:  { id },
      select: { id: true, url: true, reporteId: true },
    });
  },

  // Cuenta fotos actuales para validar el límite
  countByReporte: (reporteId: number): Promise<number> => {
    return prisma.reporteFoto.count({ where: { reporteId } });
  },

  addMany: (reporteId: number, urls: string[]): Promise<{ count: number }> => {
    return prisma.reporteFoto.createMany({
      data: urls.map((url) => ({ url, reporteId })),
    });
  },

  deleteById: (id: number) => {
    return prisma.reporteFoto.delete({ where: { id } });
  },
};