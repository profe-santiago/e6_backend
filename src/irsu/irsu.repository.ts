import { prisma } from '../lib/prisma';
import { Categoria } from '@prisma/client';

export const irsuRepository = {
  // Reportes activos (no eliminados, no resueltos, no rechazados) de una comunidad
  getReportesActivos: (comunidadId: number) => {
    return prisma.reporte.findMany({
      where: {
        comunidadId,
        deletedAt: null,
        estado:    { notIn: ['RESUELTO', 'RECHAZADO'] },
      },
      select: { gravedad: true, categoria: true },
    });
  },

  // Reportes resueltos de una comunidad
  countReportesResueltos: (comunidadId: number): Promise<number> => {
    return prisma.reporte.count({
      where: {
        comunidadId,
        estado:    'RESUELTO',
        deletedAt: null,
      },
    });
  },

  // Historial IRSU para calcular tendencia
  getHistorial: (comunidadId: number, limit = 10) => {
    return prisma.irsuHistorial.findMany({
      where:   { comunidadId, categoria: null },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      select:  { valor: true, createdAt: true },
    });
  },

  // Guarda el resultado del cálculo en el historial
  guardarHistorial: (data: {
    comunidadId:      number;
    categoria?:       Categoria;
    valor:            number;
    totalReportes:    number;
    gravedadPromedio: number;
    tendencia:        number;
  }) => {
    return prisma.irsuHistorial.create({ data });
  },

  // Actualiza el IRSU actual de la comunidad
  actualizarComunidad: (comunidadId: number, irsuActual: number, color: string) => {
    return prisma.comunidad.update({
      where: { id: comunidadId },
      data:  { irsuActual, color },
    });
  },

  // Historial para el dashboard
  findHistorial: (filtros: {
    comunidadId: number;
    categoria?:  Categoria;
    desde?:      Date;
    hasta?:      Date;
    limit:       number;
  }) => {
    return prisma.irsuHistorial.findMany({
      where: {
        comunidadId: filtros.comunidadId,
        ...(filtros.categoria && { categoria: filtros.categoria }),
        ...((filtros.desde || filtros.hasta) && {
          createdAt: {
            ...(filtros.desde && { gte: filtros.desde }),
            ...(filtros.hasta && { lte: filtros.hasta }),
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take:    filtros.limit,
    });
  },
};