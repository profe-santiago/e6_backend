import { Categoria, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

export const irsuRepository = {
  /**
   * Reportes activos
   */
  getReportesActivos: (
    comunidadId: number
  ) => {
    return prisma.reporte.findMany({
      where: {
        comunidadId,

        deletedAt: null,

        estado: {
          notIn: [
            'RESUELTO',
            'RECHAZADO',
          ],
        },
      },

      select: {
        gravedad: true,
        categoria: true,
      },
    });
  },

  /**
   * Total reportes resueltos
   */
  countReportesResueltos: (
    comunidadId: number
  ): Promise<number> => {
    return prisma.reporte.count({
      where: {
        comunidadId,

        estado: 'RESUELTO',

        deletedAt: null,
      },
    });
  },

  /**
   * Historial global
   * SOLO categoria null
   */
  getHistorialGlobal: (
    comunidadId: number,
    limit = 10
  ) => {
    return prisma.irsuHistorial.findMany({
      where: {
        comunidadId,
        categoria: null,
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: limit,

      select: {
        valor: true,
        createdAt: true,
      },
    });
  },

  /**
   * Historial por categoría
   */
  getHistorialCategoria: (
    comunidadId: number,
    categoria: Categoria,
    limit = 10
  ) => {
    return prisma.irsuHistorial.findMany({
      where: {
        comunidadId,
        categoria,
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: limit,

      select: {
        valor: true,
        createdAt: true,
      },
    });
  },

  /**
   * Guardar historial individual
   */
  guardarHistorial: (data: {
    comunidadId: number;
    categoria?: Categoria | null;
    valor: number;
    totalReportes: number;
    gravedadPromedio: number;
    tendencia: number;
  }) => {
    return prisma.irsuHistorial.create({
      data,
    });
  },

  /**
   * Guardado masivo
   */
  guardarHistorialMany: (
    data: Prisma.IrsuHistorialCreateManyInput[]
  ) => {
    return prisma.irsuHistorial.createMany({
      data,
    });
  },

  /**
   * Actualizar comunidad
   */
  actualizarComunidad: (
    comunidadId: number,
    irsuActual: number,
    color: string
  ) => {
    return prisma.comunidad.update({
      where: {
        id: comunidadId,
      },

      data: {
        irsuActual,
        color,
      },
    });
  },

  /**
   * Historial dashboard
   */
  findHistorial: (filtros: {
    comunidadId: number;
    categoria?: Categoria;
    desde?: Date;
    hasta?: Date;
    limit: number;
  }) => {
    const where: Prisma.IrsuHistorialWhereInput =
      {
        comunidadId: filtros.comunidadId,
      };

    /**
     * Categoría
     */
    if (filtros.categoria) {
      where.categoria =
        filtros.categoria;
    }

    /**
     * Rango fechas
     */
    if (
      filtros.desde ||
      filtros.hasta
    ) {
      where.createdAt = {
        ...(filtros.desde && {
          gte: filtros.desde,
        }),

        ...(filtros.hasta && {
          lte: filtros.hasta,
        }),
      };
    }

    return prisma.irsuHistorial.findMany({
      where,

      orderBy: {
        createdAt: 'desc',
      },

      take: filtros.limit,
    });
  },
};