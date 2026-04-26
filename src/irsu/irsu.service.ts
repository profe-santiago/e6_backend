import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { irsuRepository } from './irsu.repository';
import { alertaService } from '../alertas/alerta.service';
import { Categoria } from '@prisma/client';
import { IrsuResultado, IrsuCategoria } from './irsu.types';
import { FiltrosHistorialInput } from './irsu.schema';

const PESOS_CATEGORIA: Record<Categoria, number> = {
  SEGURIDAD:       1.5,
  INFRAESTRUCTURA: 1.3,
  VIALIDAD:        1.2,
  BLOQUEOS:        1.0,
};

function calcularColor(irsu: number): string {
  if (irsu > 100) return '#EF4444';
  if (irsu > 50)  return '#F59E0B';
  return '#22C55E';
}

function calcularTendencia(valores: number[]): number {
  const n = valores.length;
  if (n < 2) return 0;
  const x = valores.map((_, i) => i);
  const y = valores;
  const sumX  = x.reduce((a, b) => a + b, 0);
  const sumY  = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.round(pendiente * 100) / 100;
}

function calcularIrsu(params: {
  frecuencia: number; gravedadPromedio: number; tendencia: number;
  pesoCategoria: number; resueltos: number;
}): number {
  const { frecuencia, gravedadPromedio, tendencia, pesoCategoria, resueltos } = params;
  const T = Math.max(1, Math.abs(tendencia));
  const R = Math.max(1, resueltos);
  return Math.round((frecuencia * gravedadPromedio * T * pesoCategoria) / R * 100) / 100;
}

export const irsuService = {
  calcular: async (comunidadId: number): Promise<IrsuResultado> => {
    const [reportesActivos, resueltos, historialPrevio] = await Promise.all([
      irsuRepository.getReportesActivos(comunidadId),
      irsuRepository.countReportesResueltos(comunidadId),
      irsuRepository.getHistorial(comunidadId, 10),
    ]);

    const totalReportes = reportesActivos.length;

    if (totalReportes === 0) {
      await irsuRepository.actualizarComunidad(comunidadId, 0, '#22C55E');
      return { comunidadId, valor: 0, totalReportes: 0, gravedadPromedio: 0, tendencia: 0, porCategoria: [] };
    }

    const gravedadPromedio =
      reportesActivos.reduce((acc, r) => acc + r.gravedad, 0) / totalReportes;
    const valoresPrevios = historialPrevio.map((h) => h.valor).reverse();
    const tendencia = calcularTendencia(valoresPrevios);
    const pesoPromedio =
      reportesActivos.reduce((acc, r) => acc + PESOS_CATEGORIA[r.categoria], 0) / totalReportes;

    const valorGlobal = calcularIrsu({
      frecuencia: totalReportes,
      gravedadPromedio: Math.round(gravedadPromedio * 100) / 100,
      tendencia, pesoCategoria: pesoPromedio, resueltos,
    });

    const categorias = Object.values(Categoria) as Categoria[];
    const porCategoria: IrsuCategoria[] = [];

    for (const categoria of categorias) {
      const reportesCat = reportesActivos.filter((r) => r.categoria === categoria);
      if (reportesCat.length === 0) continue;
      const gravedadCat = reportesCat.reduce((acc, r) => acc + r.gravedad, 0) / reportesCat.length;
      const valorCat = calcularIrsu({
        frecuencia: reportesCat.length,
        gravedadPromedio: Math.round(gravedadCat * 100) / 100,
        tendencia, pesoCategoria: PESOS_CATEGORIA[categoria], resueltos,
      });
      porCategoria.push({ categoria, valor: valorCat, totalReportes: reportesCat.length, gravedadPromedio: Math.round(gravedadCat * 100) / 100 });
      await irsuRepository.guardarHistorial({ comunidadId, categoria, valor: valorCat, totalReportes: reportesCat.length, gravedadPromedio: Math.round(gravedadCat * 100) / 100, tendencia });
      await alertaService.generarSiCorresponde(comunidadId, categoria, valorCat);
    }

    await irsuRepository.guardarHistorial({ comunidadId, valor: valorGlobal, totalReportes, gravedadPromedio: Math.round(gravedadPromedio * 100) / 100, tendencia });
    await irsuRepository.actualizarComunidad(comunidadId, valorGlobal, calcularColor(valorGlobal));

    return { comunidadId, valor: valorGlobal, totalReportes, gravedadPromedio: Math.round(gravedadPromedio * 100) / 100, tendencia, porCategoria };
  },

  calcularTodas: async () => {
    const comunidades = await prisma.comunidad.findMany({ where: { status: 'ACTIVO' }, select: { id: true } });
    const resultados  = await Promise.allSettled(comunidades.map((c) => irsuService.calcular(c.id)));
    return {
      total:    comunidades.length,
      exitosos: resultados.filter((r) => r.status === 'fulfilled').length,
      fallidos: resultados.filter((r) => r.status === 'rejected').length,
    };
  },

  getHistorial: async (comunidadId: number, filtros: FiltrosHistorialInput) => {
    const comunidad = await prisma.comunidad.findUnique({
      where:  { id: comunidadId },
      select: { id: true, irsuActual: true, color: true, nombre: true },
    });
    if (!comunidad) throw new AppError(404, 'Comunidad no encontrada');
    const historial = await irsuRepository.findHistorial({ comunidadId, ...filtros });
    return { comunidad, historial };
  },
};