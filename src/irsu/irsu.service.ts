import { prisma } from '../lib/prisma';
import { irsuRepository } from './irsu.repository';
import { alertaService } from '../alertas/alerta.service';
import { Categoria } from '@prisma/client';
import { IrsuResultado, IrsuCategoria } from './irsu.types';
import { FiltrosHistorialInput } from './irsu.schema';

// RF-08: Pesos por categoría
const PESOS_CATEGORIA: Record<Categoria, number> = {
  SEGURIDAD:       1.5,
  INFRAESTRUCTURA: 1.3,
  VIALIDAD:        1.2,
  BLOQUEOS:        1.0,
};

// Color del semáforo según el valor IRSU
function calcularColor(irsu: number): string {
  if (irsu > 100) return '#EF4444'; // rojo
  if (irsu > 50)  return '#F59E0B'; // amarillo
  return '#22C55E';                 // verde
}

// Regresión lineal simple sobre el historial
// Devuelve la pendiente (tendencia positiva = empeora, negativa = mejora)
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

//Fórmula principal IRSU = (F × G × T × C) / R
function calcularIrsu(params: {
  frecuencia:       number;
  gravedadPromedio: number;
  tendencia:        number;
  pesoCategoria:    number;
  resueltos:        number;
}): number {
  const { frecuencia, gravedadPromedio, tendencia, pesoCategoria, resueltos } = params;

  // Tendencia mínima de 1 para no anular el cálculo
  const T = Math.max(1, Math.abs(tendencia));
  // Divisor mínimo de 1 para evitar división por cero
  const R = Math.max(1, resueltos);

  const valor = (frecuencia * gravedadPromedio * T * pesoCategoria) / R;
  return Math.round(valor * 100) / 100;
}

export const irsuService = {
  // RF-08-2: Calcula IRSU global y por categoría para una comunidad
  calcular: async (comunidadId: number): Promise<IrsuResultado> => {
    const [reportesActivos, resueltos, historialPrevio] = await Promise.all([
      irsuRepository.getReportesActivos(comunidadId),
      irsuRepository.countReportesResueltos(comunidadId),
      irsuRepository.getHistorial(comunidadId, 10),
    ]);

    const totalReportes = reportesActivos.length;

    // Sin reportes activos → IRSU = 0
    if (totalReportes === 0) {
      await irsuRepository.actualizarComunidad(comunidadId, 0, '#22C55E');
      return {
        comunidadId,
        valor:            0,
        totalReportes:    0,
        gravedadPromedio: 0,
        tendencia:        0,
        porCategoria:     [],
      };
    }

    // Gravedad promedio global
    const gravedadPromedio =
      reportesActivos.reduce((acc, r) => acc + r.gravedad, 0) / totalReportes;

    // Tendencia sobre historial previo
    const valoresPrevios = historialPrevio.map((h) => h.valor).reverse();
    const tendencia = calcularTendencia(valoresPrevios);

    // Peso promedio ponderado de categorías presentes
    const pesoPromedio =
      reportesActivos.reduce((acc, r) => acc + PESOS_CATEGORIA[r.categoria], 0) /
      totalReportes;

    // IRSU global
    const valorGlobal = calcularIrsu({
      frecuencia:       totalReportes,
      gravedadPromedio: Math.round(gravedadPromedio * 100) / 100,
      tendencia,
      pesoCategoria:    pesoPromedio,
      resueltos,
    });

    //IRSU por categoría
    const categorias = Object.values(Categoria) as Categoria[];
    const porCategoria: IrsuCategoria[] = [];

    for (const categoria of categorias) {
      const reportesCat = reportesActivos.filter((r) => r.categoria === categoria);
      if (reportesCat.length === 0) continue;

      const gravedadCat =
        reportesCat.reduce((acc, r) => acc + r.gravedad, 0) / reportesCat.length;

      const valorCat = calcularIrsu({
        frecuencia:       reportesCat.length,
        gravedadPromedio: Math.round(gravedadCat * 100) / 100,
        tendencia,
        pesoCategoria:    PESOS_CATEGORIA[categoria],
        resueltos,
      });

      porCategoria.push({
        categoria,
        valor:            valorCat,
        totalReportes:    reportesCat.length,
        gravedadPromedio: Math.round(gravedadCat * 100) / 100,
      });

      // Guarda historial por categoría
      await irsuRepository.guardarHistorial({
        comunidadId,
        categoria,
        valor:            valorCat,
        totalReportes:    reportesCat.length,
        gravedadPromedio: Math.round(gravedadCat * 100) / 100,
        tendencia,
      });

      // Genera alerta si corresponde por categoría
      await alertaService.generarSiCorresponde(comunidadId, categoria, valorCat);
    }

    // Guarda historial global
    await irsuRepository.guardarHistorial({
      comunidadId,
      valor:            valorGlobal,
      totalReportes,
      gravedadPromedio: Math.round(gravedadPromedio * 100) / 100,
      tendencia,
    });

    // Actualiza IRSU actual en la comunidad
    const color = calcularColor(valorGlobal);
    await irsuRepository.actualizarComunidad(comunidadId, valorGlobal, color);

    return {
      comunidadId,
      valor:            valorGlobal,
      totalReportes,
      gravedadPromedio: Math.round(gravedadPromedio * 100) / 100,
      tendencia,
      porCategoria,
    };
  },

  // Recalcula IRSU de todas las comunidades activas
  // Este método lo puede llamar un cron job
  calcularTodas: async () => {
    const comunidades = await prisma.comunidad.findMany({
      where:  { status: 'ACTIVO' },
      select: { id: true },
    });

    const resultados = await Promise.allSettled(
      comunidades.map((c) => irsuService.calcular(c.id))
    );

    const exitosos  = resultados.filter((r) => r.status === 'fulfilled').length;
    const fallidos  = resultados.filter((r) => r.status === 'rejected').length;

    return { total: comunidades.length, exitosos, fallidos };
  },

  // Obtiene el historial IRSU de una comunidad para el dashboard
  getHistorial: async (comunidadId: number, filtros: FiltrosHistorialInput) => {
    const comunidad = await prisma.comunidad.findUnique({
      where:  { id: comunidadId },
      select: { id: true, irsuActual: true, color: true, nombre: true },
    });

    if (!comunidad) {
      throw Object.assign(new Error('Comunidad no encontrada'), { statusCode: 404 });
    }

    const historial = await irsuRepository.findHistorial({
      comunidadId,
      categoria: filtros.categoria,
      desde:     filtros.desde,
      hasta:     filtros.hasta,
      limit:     filtros.limit,
    });

    return {
      comunidad,
      historial,
    };
  },
};