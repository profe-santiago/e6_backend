import { prisma } from '../lib/prisma';
import { CodigoPostalResponse } from './codigo-postal.types';

export const codigoPostalRepository = {
  findByCodigo: (codigo: string): Promise<CodigoPostalResponse[]> => {
    return prisma.codigoPostal.findMany({
      where:   { codigo },
      select:  { id: true, codigo: true, colonia: true, municipioId: true },
      orderBy: { colonia: 'asc' },
      take:    50,
    });
  },

  findById: (id: number): Promise<CodigoPostalResponse | null> => {
    return prisma.codigoPostal.findUnique({
      where:  { id },
      select: { id: true, codigo: true, colonia: true, municipioId: true },
    });
  },

  findByMunicipio: (municipioId: number): Promise<CodigoPostalResponse[]> => {
    return prisma.codigoPostal.findMany({
      where:   { municipioId },
      select:  { id: true, codigo: true, colonia: true, municipioId: true },
      orderBy: { codigo: 'asc' },
    });
  },
};