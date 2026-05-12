import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { irsuRepository } from './irsu.repository';
import { alertaService } from '../alertas/alerta.service';

import { Categoria, Prisma } from '@prisma/client';

import { IrsuResultado, IrsuCategoria } from './irsu.types';
import {
  DashboardStatsInput,
  FiltrosHistorialInput,
} from './irsu.schema';

import { TokenPayload } from '../auth/auth.types';

const PESOS_CATEGORIA: Record<Categoria, number> = {
  SEGURIDAD: 1.5,
  INFRAESTRUCTURA: 1.3,
  VIALIDAD: 1.2,
  BLOQUEOS: 1.0,
};

function calcularColor(irsu: number): string {
  if (irsu >= 70) return '#EF4444';
  if (irsu >= 40) return '#F59E0B';
  return '#22C55E';
}

function redondear(valor: number, decimales = 2): number {
  return Number(valor.toFixed(decimales));
}

/**
 * Regresión lineal simple
 */
function calcularTendencia(valores: number[]): number {
  const n = valores.length;

  if (n < 2) return 0;

  const x = valores.map((_, i) => i);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = valores.reduce((a, b) => a + b, 0);

  const sumXY = x.reduce(
    (acc, xi, i) => acc + xi * valores[i],
    0
  );

  const sumX2 = x.reduce(
    (acc, xi) => acc + xi * xi,
    0
  );

  const denominador = n * sumX2 - sumX * sumX;

  if (denominador === 0) return 0;

  return redondear(
    (n * sumXY - sumX * sumY) / denominador
  );
}

/**
 * Normaliza el valor a 0-100
 */
function normalizar(valor: number): number {
  return Math.min(100, Math.max(0, valor));
}

function calcularIrsu(params: {
  frecuencia: number;
  gravedadPromedio: number;
  tendencia: number;
  pesoCategoria: number;
  totalResueltos: number;
}) {
  const {
    frecuencia,
    gravedadPromedio,
    tendencia,
    pesoCategoria,
    totalResueltos,
  } = params;

  /**
   * Si la tendencia es positiva empeora.
   * Si es negativa mejora.
   */
  const factorTendencia =
    tendencia > 0
      ? 1 + tendencia
      : 1;

  /**
   * Tasa de resolución
   */
  const total = frecuencia + totalResueltos;

  const tasaResolucion =
    total === 0
      ? 0
      : totalResueltos / total;

  /**
   * Fórmula base
   */
  const valor =
    frecuencia *
    gravedadPromedio *
    pesoCategoria *
    factorTendencia *
    (1 - tasaResolucion);

  return redondear(normalizar(valor));
}

export const irsuService = {
  calcular: async (
    comunidadId: number
  ): Promise<IrsuResultado> => {
    const [
      reportesActivos,
      totalResueltos,
      historialPrevio,
    ] = await Promise.all([
      irsuRepository.getReportesActivos(comunidadId),

      irsuRepository.countReportesResueltos(
        comunidadId
      ),

      irsuRepository.getHistorialGlobal(
        comunidadId,
        10
      ),
    ]);

    const totalReportes =
      reportesActivos.length;

    /**
     * Sin reportes
     */
    if (totalReportes === 0) {
      await prisma.comunidad.update({
        where: { id: comunidadId },

        data: {
          irsuActual: 0,
          color: '#22C55E',
        },
      });

      return {
        comunidadId,
        valor: 0,
        totalReportes: 0,
        gravedadPromedio: 0,
        tendencia: 0,
        porCategoria: [],
      };
    }

    /**
     * Promedio gravedad
     */
    const gravedadPromedio =
      reportesActivos.reduce(
        (acc, r) => acc + r.gravedad,
        0
      ) / totalReportes;

    /**
     * Tendencia histórica
     */
    const valoresPrevios =
      historialPrevio
        .map((h) => h.valor)
        .reverse();

    const tendencia =
      calcularTendencia(valoresPrevios);

    /**
     * Agrupar reportes por categoría
     */
    const agrupados =
      reportesActivos.reduce(
        (acc, reporte) => {
          if (!acc[reporte.categoria]) {
            acc[reporte.categoria] = [];
          }

          acc[reporte.categoria].push(reporte);

          return acc;
        },
        {} as Record<
          Categoria,
          typeof reportesActivos
        >
      );

    /**
     * Peso promedio global
     */
    const pesoPromedio =
      reportesActivos.reduce(
        (acc, r) =>
          acc +
          PESOS_CATEGORIA[r.categoria],
        0
      ) / totalReportes;

    /**
     * IRSU global
     */
    const valorGlobal =
      calcularIrsu({
        frecuencia: totalReportes,

        gravedadPromedio:
          redondear(gravedadPromedio),

        tendencia,

        pesoCategoria:
          redondear(pesoPromedio),

        totalResueltos,
      });

    const porCategoria: IrsuCategoria[] = [];

    /**
     * Operaciones batch
     */
    const historialData:
      Prisma.IrsuHistorialCreateManyInput[] =
      [];

    const alertasPromises:
      Promise<unknown>[] = [];

    /**
     * Categorías
     */
    for (const categoria of Object.keys(
      agrupados
    ) as Categoria[]) {
      const reportesCat =
        agrupados[categoria];

      const totalCategoria =
        reportesCat.length;

      const gravedadCategoria =
        reportesCat.reduce(
          (acc, r) => acc + r.gravedad,
          0
        ) / totalCategoria;

      const valorCategoria =
        calcularIrsu({
          frecuencia: totalCategoria,

          gravedadPromedio:
            redondear(gravedadCategoria),

          tendencia,

          pesoCategoria:
            PESOS_CATEGORIA[categoria],

          totalResueltos,
        });

      const categoriaResult: IrsuCategoria = {
        categoria,
        valor: valorCategoria,
        totalReportes: totalCategoria,
        gravedadPromedio:
          redondear(gravedadCategoria),
      };

      porCategoria.push(categoriaResult);

      historialData.push({
        comunidadId,

        categoria,

        valor: valorCategoria,

        totalReportes: totalCategoria,

        gravedadPromedio:
          redondear(gravedadCategoria),

        tendencia,
      });

      alertasPromises.push(
        alertaService.generarSiCorresponde(
          comunidadId,
          categoria,
          valorCategoria
        )
      );
    }

    /**
     * Historial global
     */
    historialData.push({
      comunidadId,

      categoria: null,

      valor: valorGlobal,

      totalReportes,

      gravedadPromedio:
        redondear(gravedadPromedio),

      tendencia,
    });

    /**
     * Transacción
     */
    await prisma.$transaction(async (tx) => {
      await tx.irsuHistorial.createMany({
        data: historialData,
      });

      await tx.comunidad.update({
        where: { id: comunidadId },

        data: {
          irsuActual: valorGlobal,
          color: calcularColor(valorGlobal),
        },
      });
    });

    /**
     * Alertas fuera de transacción
     */
    await Promise.all(alertasPromises);

    return {
      comunidadId,

      valor: valorGlobal,

      totalReportes,

      gravedadPromedio:
        redondear(gravedadPromedio),

      tendencia,

      porCategoria,
    };
  },

  calcularTodas: async () => {
    const comunidades =
      await prisma.comunidad.findMany({
        where: {
          status: 'ACTIVO',
        },

        select: {
          id: true,
        },
      });

    /**
     * Procesamiento por bloques
     */
    const chunkSize = 10;

    let exitosos = 0;
    let fallidos = 0;

    for (
      let i = 0;
      i < comunidades.length;
      i += chunkSize
    ) {
      const chunk =
        comunidades.slice(
          i,
          i + chunkSize
        );

      const resultados =
        await Promise.allSettled(
          chunk.map((c) =>
            irsuService.calcular(c.id)
          )
        );

      exitosos += resultados.filter(
        (r) => r.status === 'fulfilled'
      ).length;

      fallidos += resultados.filter(
        (r) => r.status === 'rejected'
      ).length;
    }

    return {
      total: comunidades.length,
      exitosos,
      fallidos,
    };
  },

  getHistorial: async (
    comunidadId: number,
    filtros: FiltrosHistorialInput
  ) => {
    const comunidad =
      await prisma.comunidad.findUnique({
        where: {
          id: comunidadId,
        },

        select: {
          id: true,
          nombre: true,
          irsuActual: true,
          color: true,
        },
      });

    if (!comunidad) {
      throw new AppError(
        404,
        'Comunidad no encontrada'
      );
    }

    const historial =
      await irsuRepository.findHistorial({
        comunidadId,
        ...filtros,
      });

    return {
      comunidad,
      historial,
    };
  },

  getDashboardStats: async (
    filtros: DashboardStatsInput,
    user: TokenPayload
  ) => {
    const dias =
      filtros.periodo === '7D'
        ? 7
        : filtros.periodo === '30D'
        ? 30
        : 90;

    const desde = new Date();

    desde.setDate(
      desde.getDate() - dias
    );

    /**
     * Filtro comunidades
     */
    const comunidadWhere:
      Prisma.ComunidadWhereInput =
      user.rol === 'COORDINADOR' &&
      user.comunidadId
        ? {
            id: user.comunidadId,
          }
        : user.rol === 'ADMIN' &&
          user.municipioId
        ? {
            municipioId:
              user.municipioId,
          }
        : {};

    /**
     * Historial global
     */
    const historial =
      await prisma.irsuHistorial.findMany({
        where: {
          categoria: null,

          createdAt: {
            gte: desde,
          },

          comunidad: comunidadWhere,
        },

        select: {
          valor: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: 'asc',
        },
      });

    /**
     * Agrupar por día
     */
    const porDia:
      Record<string, number[]> = {};

    for (const item of historial) {
      const fecha =
        item.createdAt
          .toISOString()
          .split('T')[0];

      if (!porDia[fecha]) {
        porDia[fecha] = [];
      }

      porDia[fecha].push(item.valor);
    }

    const serie = Object.entries(
      porDia
    ).map(([fecha, valores]) => ({
      fecha,

      irsu: redondear(
        valores.reduce(
          (a, b) => a + b,
          0
        ) / valores.length,
        1
      ),
    }));

    /**
     * Filtros reportes
     */
    const reporteWhere:
      Prisma.ReporteWhereInput = {
      deletedAt: null,

      ...(user.rol ===
        'COORDINADOR' &&
      user.comunidadId
        ? {
            comunidadId:
              user.comunidadId,
          }
        : {}),

      ...(user.rol === 'ADMIN' &&
      user.municipioId
        ? {
            comunidad: {
              municipioId:
                user.municipioId,
            },
          }
        : {}),
    };

    const [
      totalReportes,
      pendientes,
      enProceso,
      resueltos,
    ] = await Promise.all([
      prisma.reporte.count({
        where: reporteWhere,
      }),

      prisma.reporte.count({
        where: {
          ...reporteWhere,
          estado: 'PENDIENTE',
        },
      }),

      prisma.reporte.count({
        where: {
          ...reporteWhere,
          estado: 'EN_PROCESO',
        },
      }),

      prisma.reporte.count({
        where: {
          ...reporteWhere,
          estado: 'RESUELTO',
        },
      }),
    ]);

    return {
      serie,

      kpis: {
        totalReportes,
        pendientes,
        enProceso,
        resueltos,
      },
    };
  },
};