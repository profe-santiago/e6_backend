import { describe, it, expect } from 'vitest';
import {
  redondear,
  calcularTendencia,
  normalizar,
  calcularColor,
  calcularIrsu,
  PESOS_CATEGORIA,
} from '../../src/irsu/irsu.utils';

// ─── redondear ────────────────────────────────────────────────────────────────
describe('redondear', () => {
  it('redondea a 2 decimales por defecto', () => {
    expect(redondear(3.14159)).toBe(3.14);
  });

  it('acepta precisión personalizada', () => {
    expect(redondear(3.14159, 4)).toBe(3.1416);
  });

  it('enteros quedan igual', () => {
    expect(redondear(5, 2)).toBe(5);
  });

  it('retorna 0 para 0', () => {
    expect(redondear(0)).toBe(0);
  });
});

// ─── calcularTendencia ────────────────────────────────────────────────────────
describe('calcularTendencia', () => {
  it('retorna 0 con arreglo vacío', () => {
    expect(calcularTendencia([])).toBe(0);
  });

  it('retorna 0 con un solo valor', () => {
    expect(calcularTendencia([42])).toBe(0);
  });

  it('retorna 0 con valores constantes', () => {
    expect(calcularTendencia([10, 10, 10, 10])).toBe(0);
  });

  it('detecta tendencia positiva (situación empeorando)', () => {
    const t = calcularTendencia([10, 20, 30, 40, 50]);
    expect(t).toBeGreaterThan(0);
  });

  it('detecta tendencia negativa (situación mejorando)', () => {
    const t = calcularTendencia([50, 40, 30, 20, 10]);
    expect(t).toBeLessThan(0);
  });

  it('retorna un número con máximo 2 decimales', () => {
    const t          = calcularTendencia([1, 3, 5, 7]);
    const decimales  = t.toString().split('.')[1]?.length ?? 0;
    expect(decimales).toBeLessThanOrEqual(2);
  });
});

// ─── normalizar ───────────────────────────────────────────────────────────────
describe('normalizar', () => {
  it('limita a 100 como máximo', () => {
    expect(normalizar(150)).toBe(100);
    expect(normalizar(100)).toBe(100);
  });

  it('limita a 0 como mínimo', () => {
    expect(normalizar(-1)).toBe(0);
    expect(normalizar(0)).toBe(0);
  });

  it('no modifica valores dentro del rango', () => {
    expect(normalizar(55)).toBe(55);
    expect(normalizar(0.5)).toBe(0.5);
  });
});

// ─── calcularColor ────────────────────────────────────────────────────────────
describe('calcularColor', () => {
  it('retorna rojo (#EF4444) para IRSU >= 70', () => {
    expect(calcularColor(70)).toBe('#EF4444');
    expect(calcularColor(100)).toBe('#EF4444');
  });

  it('retorna amarillo (#F59E0B) para 40 ≤ IRSU < 70', () => {
    expect(calcularColor(40)).toBe('#F59E0B');
    expect(calcularColor(69)).toBe('#F59E0B');
  });

  it('retorna verde (#22C55E) para IRSU < 40', () => {
    expect(calcularColor(0)).toBe('#22C55E');
    expect(calcularColor(39)).toBe('#22C55E');
  });
});

// ─── PESOS_CATEGORIA ─────────────────────────────────────────────────────────
describe('PESOS_CATEGORIA', () => {
  it('SEGURIDAD tiene el mayor peso del sistema', () => {
    const pesos = Object.values(PESOS_CATEGORIA);
    expect(PESOS_CATEGORIA.SEGURIDAD).toBe(Math.max(...pesos));
  });

  it('cubre exactamente las 4 categorías del dominio', () => {
    expect(Object.keys(PESOS_CATEGORIA)).toHaveLength(4);
    expect(PESOS_CATEGORIA).toHaveProperty('SEGURIDAD');
    expect(PESOS_CATEGORIA).toHaveProperty('INFRAESTRUCTURA');
    expect(PESOS_CATEGORIA).toHaveProperty('VIALIDAD');
    expect(PESOS_CATEGORIA).toHaveProperty('BLOQUEOS');
  });

  it('todos los pesos son > 0', () => {
    Object.values(PESOS_CATEGORIA).forEach((p) => expect(p).toBeGreaterThan(0));
  });
});

// ─── calcularIrsu ─────────────────────────────────────────────────────────────
describe('calcularIrsu', () => {
  it('retorna 0 cuando no hay reportes activos', () => {
    expect(
      calcularIrsu({ frecuencia: 0, gravedadPromedio: 0, tendencia: 0, pesoCategoria: 1, totalResueltos: 0 })
    ).toBe(0);
  });

  it('alta tasa de resolución reduce el índice significativamente', () => {
    const sinResolucion = calcularIrsu({ frecuencia: 20, gravedadPromedio: 3, tendencia: 0, pesoCategoria: 1.0, totalResueltos: 0 });
    const conResolucion = calcularIrsu({ frecuencia: 20, gravedadPromedio: 3, tendencia: 0, pesoCategoria: 1.0, totalResueltos: 20 });
    expect(conResolucion).toBeLessThan(sinResolucion);
  });

  it('tendencia positiva aumenta el índice (factorTendencia > 1)', () => {
    const sinTendencia = calcularIrsu({ frecuencia: 10, gravedadPromedio: 3, tendencia: 0,   pesoCategoria: 1.0, totalResueltos: 0 });
    const conTendencia = calcularIrsu({ frecuencia: 10, gravedadPromedio: 3, tendencia: 0.5, pesoCategoria: 1.0, totalResueltos: 0 });
    expect(conTendencia).toBeGreaterThan(sinTendencia);
  });

  it('tendencia negativa no penaliza (factorTendencia queda en 1)', () => {
    const sinTendencia = calcularIrsu({ frecuencia: 10, gravedadPromedio: 3, tendencia: 0,    pesoCategoria: 1.0, totalResueltos: 0 });
    const mejorando    = calcularIrsu({ frecuencia: 10, gravedadPromedio: 3, tendencia: -0.5, pesoCategoria: 1.0, totalResueltos: 0 });
    expect(mejorando).toBe(sinTendencia);
  });

  it('mayor peso de categoría produce mayor índice', () => {
    const base      = calcularIrsu({ frecuencia: 5, gravedadPromedio: 3, tendencia: 0, pesoCategoria: 1.0, totalResueltos: 0 });
    const pesoAlto  = calcularIrsu({ frecuencia: 5, gravedadPromedio: 3, tendencia: 0, pesoCategoria: 1.5, totalResueltos: 0 });
    expect(pesoAlto).toBeGreaterThan(base);
  });

  it('mayor gravedad produce mayor índice', () => {
    const gravedadBaja = calcularIrsu({ frecuencia: 10, gravedadPromedio: 1, tendencia: 0, pesoCategoria: 1.0, totalResueltos: 0 });
    const gravedadAlta = calcularIrsu({ frecuencia: 10, gravedadPromedio: 5, tendencia: 0, pesoCategoria: 1.0, totalResueltos: 0 });
    expect(gravedadAlta).toBeGreaterThan(gravedadBaja);
  });

  it('el resultado está siempre en [0, 100] sin importar la magnitud de entrada', () => {
    const extremo = calcularIrsu({ frecuencia: 100_000, gravedadPromedio: 5, tendencia: 100, pesoCategoria: 2.0, totalResueltos: 0 });
    expect(extremo).toBeGreaterThanOrEqual(0);
    expect(extremo).toBeLessThanOrEqual(100);
  });

  it('a mayor cantidad de resueltos, menor es el índice', () => {
    const pocoResueltos = calcularIrsu({
      frecuencia: 10, gravedadPromedio: 5, tendencia: 0,
      pesoCategoria: 1.5, totalResueltos: 1,
    });
    const muchoResueltos = calcularIrsu({
      frecuencia: 10, gravedadPromedio: 5, tendencia: 0,
      pesoCategoria: 1.5, totalResueltos: 1000,
    });
    expect(muchoResueltos).toBeLessThan(pocoResueltos);
  });
});
