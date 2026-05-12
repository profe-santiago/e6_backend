import { prisma } from '../lib/prisma';
import { CodigoPostalResponse } from './codigo-postal.types';

export const codigoPostalRepository = {
  findByCodigo: (codigo: string) => {
    return prisma.codigoPostal.findMany({
      where:   { codigo },
      select:  {
        id:         true,
        codigo:     true,
        colonia:    true,
        municipioId: true,
        municipio:  { select: { nombre: true } },
        comunidades: {
          select: { id: true, nombre: true, slug: true, status: true },
          where:  { status: 'ACTIVO' },
        },
      },
      orderBy: { colonia: 'asc' },
      take:    50,
    });
  },

  findById: (id: number) => {
    return prisma.codigoPostal.findUnique({
      where:  { id },
      select: { id: true, codigo: true, colonia: true, municipioId: true },
    });
  },

  findByMunicipio: (municipioId: number) => {
    return prisma.codigoPostal.findMany({
      where:   { municipioId },
      select:  { id: true, codigo: true, colonia: true, municipioId: true },
      orderBy: { codigo: 'asc' },
    });
  },
};