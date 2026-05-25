import { Categoria } from '@prisma/client';

export const PESOS_CATEGORIA: Record<Categoria, number> = {
  SEGURIDAD:       1.5,
  INFRAESTRUCTURA: 1.3,
  VIALIDAD:        1.2,
  BLOQUEOS:        1.0,
};

export function redondear(valor: number, decimales = 2): number {
  return Number(valor.toFixed(decimales));
}

/** Regresión lineal simple — retorna la pendiente de la serie temporal */
export function calcularTendencia(valores: number[]): number {
  const n = valores.length;
  if (n < 2) return 0;

  const x    = valores.map((_, i) => i);
  const sumX  = x.reduce((a, b) => a + b, 0);
  const sumY  = valores.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * valores[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  const denominador = n * sumX2 - sumX * sumX;
  if (denominador === 0) return 0;

  return redondear((n * sumXY - sumX * sumY) / denominador);
}

/** Normaliza a 0–100 */
export function normalizar(valor: number): number {
  return Math.min(100, Math.max(0, valor));
}

/** Color del marcador según nivel de riesgo IRSU */
export function calcularColor(irsu: number): string {
  if (irsu >= 70) return '#EF4444'; // rojo   — crítico
  if (irsu >= 40) return '#F59E0B'; // amarillo — atención
  return '#22C55E';                  // verde   — normal
}

export interface CalcIrsuParams {
  frecuencia:       number;
  gravedadPromedio: number;
  tendencia:        number;
  pesoCategoria:    number;
  totalResueltos:   number;
}

/**
 * Fórmula IRSU:
 *   valor = frecuencia × gravedadPromedio × pesoCategoria × factorTendencia × (1 − tasaResolucion)
 * Normalizado a [0, 100].
 *
 * - factorTendencia > 1 sólo si la tendencia es positiva (situación empeorando).
 * - tasaResolucion penaliza positivamente: más resueltos → menor IRSU.
 */
export function calcularIrsu(params: CalcIrsuParams): number {
  const { frecuencia, gravedadPromedio, tendencia, pesoCategoria, totalResueltos } = params;

  const factorTendencia = tendencia > 0 ? 1 + tendencia : 1;

  const total          = frecuencia + totalResueltos;
  const tasaResolucion = total === 0 ? 0 : totalResueltos / total;

  const valor =
    frecuencia *
    gravedadPromedio *
    pesoCategoria *
    factorTendencia *
    (1 - tasaResolucion);

  return redondear(normalizar(valor));
}
