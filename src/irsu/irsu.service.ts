import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { irsuRepository } from './irsu.repository';
import { alertaService } from '../alertas/alerta.service';
import { Categoria, Prisma } from '@prisma/client';
import { IrsuResultado, IrsuCategoria } from './irsu.types';
import { DashboardStatsInput, FiltrosHistorialInput } from './irsu.schema';
import { TokenPayload } from '../auth/auth.types';

// ── Pure functions ahora viven en irsu.utils.ts (testeables de forma aislada) ──
import {
  PESOS_CATEGORIA,
  redondear,
  calcularTendencia,
  normalizar,
  calcularColor,
  calcularIrsu as calcularValorIrsu,
} from './irsu.utils';

export const irsuService = {
  calcular: async (comunidadId: number): Promise<IrsuResultado> => {
    const [reportesActivos, totalResueltos, historialPrevio] = await Promise.all([
      irsuRepository.getReportesActivos(comunidadId),
      irsuRepository.countReportesResueltos(comunidadId),
      irsuRepository.getHistorialGlobal(comunidadId, 10),
    ]);

    const totalReportes = reportesActivos.length;

    if (totalReportes === 0) {
      await prisma.comunidad.update({
        where: { id: comunidadId },
        data:  { irsuActual: 0, color: '#22C55E' },
      });
      return { comunidadId, valor: 0, totalReportes: 0, gravedadPromedio: 0, tendencia: 0, porCategoria: [] };
    }

    const gravedadPromedio =
      reportesActivos.reduce((acc, r) => acc + r.gravedad, 0) / totalReportes;

    const valoresPrevios = historialPrevio.map((h) => h.valor).reverse();
    const tendencia      = calcularTendencia(valoresPrevios);

    const agrupados = reportesActivos.reduce(
      (acc, reporte) => {
        if (!acc[reporte.categoria]) acc[reporte.categoria] = [];
        acc[reporte.categoria].push(reporte);
        return acc;
      },
      {} as Record<Categoria, typeof reportesActivos>,
    );

    const pesoPromedio =
      reportesActivos.reduce((acc, r) => acc + PESOS_CATEGORIA[r.categoria], 0) / totalReportes;

    const valorGlobal = calcularValorIrsu({
      frecuencia:       totalReportes,
      gravedadPromedio: redondear(gravedadPromedio),
      tendencia,
      pesoCategoria:    redondear(pesoPromedio),
      totalResueltos,
    });

    const porCategoria: IrsuCategoria[]                      = [];
    const historialData: Prisma.IrsuHistorialCreateManyInput[] = [];
    const alertasPromises: Promise<unknown>[]                 = [];

    for (const categoria of Object.keys(agrupados) as Categoria[]) {
      const reportesCat     = agrupados[categoria];
      const totalCategoria  = reportesCat.length;
      const gravedadCat     = reportesCat.reduce((acc, r) => acc + r.gravedad, 0) / totalCategoria;

      const valorCategoria = calcularValorIrsu({
        frecuencia:       totalCategoria,
        gravedadPromedio: redondear(gravedadCat),
        tendencia,
        pesoCategoria:    PESOS_CATEGORIA[categoria],
        totalResueltos,
      });

      porCategoria.push({ categoria, valor: valorCategoria, totalReportes: totalCategoria, gravedadPromedio: redondear(gravedadCat) });
      historialData.push({ comunidadId, categoria, valor: valorCategoria, totalReportes: totalCategoria, gravedadPromedio: redondear(gravedadCat), tendencia });
      alertasPromises.push(alertaService.generarSiCorresponde(comunidadId, categoria, valorCategoria));
    }

    historialData.push({ comunidadId, categoria: null, valor: valorGlobal, totalReportes, gravedadPromedio: redondear(gravedadPromedio), tendencia });

    await prisma.$transaction(async (tx) => {
      await tx.irsuHistorial.createMany({ data: historialData });
      await tx.comunidad.update({
        where: { id: comunidadId },
        data:  { irsuActual: valorGlobal, color: calcularColor(valorGlobal) },
      });
    });

    await Promise.all(alertasPromises);

    return { comunidadId, valor: valorGlobal, totalReportes, gravedadPromedio: redondear(gravedadPromedio), tendencia, porCategoria };
  },

  calcularTodas: async () => {
    const comunidades = await prisma.comunidad.findMany({ where: { status: 'ACTIVO' }, select: { id: true } });

    const chunkSize = 10;
    let exitosos = 0;
    let fallidos  = 0;

    for (let i = 0; i < comunidades.length; i += chunkSize) {
      const chunk      = comunidades.slice(i, i + chunkSize);
      const resultados = await Promise.allSettled(chunk.map((c) => irsuService.calcular(c.id)));
      exitosos += resultados.filter((r) => r.status === 'fulfilled').length;
      fallidos  += resultados.filter((r) => r.status === 'rejected').length;
    }

    return { total: comunidades.length, exitosos, fallidos };
  },

  getHistorial: async (comunidadId: number, filtros: FiltrosHistorialInput) => {
    const comunidad = await prisma.comunidad.findUnique({
      where:  { id: comunidadId },
      select: { id: true, nombre: true, irsuActual: true, color: true },
    });
    if (!comunidad) throw new AppError(404, 'Comunidad no encontrada');

    const historial = await irsuRepository.findHistorial({ comunidadId, ...filtros });
    return { comunidad, historial };
  },

  getDashboardStats: async (filtros: DashboardStatsInput, user: TokenPayload) => {
    const dias  = filtros.periodo === '7D' ? 7 : filtros.periodo === '30D' ? 30 : 90;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const comunidadWhere: Prisma.ComunidadWhereInput =
      user.rol === 'COORDINADOR' && user.comunidadId ? { id: user.comunidadId } :
      user.rol === 'ADMIN' && user.municipioId        ? { municipioId: user.municipioId } :
      {};

    const historial = await prisma.irsuHistorial.findMany({
      where:   { categoria: null, createdAt: { gte: desde }, comunidad: comunidadWhere },
      select:  { valor: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const porDia: Record<string, number[]> = {};
    for (const item of historial) {
      const fecha = item.createdAt.toISOString().split('T')[0];
      if (!porDia[fecha]) porDia[fecha] = [];
      porDia[fecha].push(item.valor);
    }

    const serie = Object.entries(porDia).map(([fecha, valores]) => ({
      fecha,
      irsu: redondear(valores.reduce((a, b) => a + b, 0) / valores.length, 1),
    }));

    const reporteWhere: Prisma.ReporteWhereInput = {
      deletedAt: null,
      ...(user.rol === 'COORDINADOR' && user.comunidadId ? { comunidadId: user.comunidadId } : {}),
      ...(user.rol === 'ADMIN' && user.municipioId ? { comunidad: { municipioId: user.municipioId } } : {}),
    };

    const [totalReportes, pendientes, enProceso, resueltos] = await Promise.all([
      prisma.reporte.count({ where: reporteWhere }),
      prisma.reporte.count({ where: { ...reporteWhere, estado: 'PENDIENTE' } }),
      prisma.reporte.count({ where: { ...reporteWhere, estado: 'EN_PROCESO' } }),
      prisma.reporte.count({ where: { ...reporteWhere, estado: 'RESUELTO' } }),
    ]);

    return { serie, kpis: { totalReportes, pendientes, enProceso, resueltos } };
  },
};