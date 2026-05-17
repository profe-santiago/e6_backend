import { Municipio } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const municipioRepository = {
  findAll: (): Promise<Municipio[]> => {
    return prisma.municipio.findMany({
        orderBy: { id: 'asc' },
    });
    },

  findById: (id: number): Promise<Municipio | null> => {
    return prisma.municipio.findUnique({ where: { id } });
  },

  findByClave: (clave: string): Promise<Municipio | null> => {
    return prisma.municipio.findUnique({ where: { clave } });
  },

  findByNombre: (nombre: string): Promise<Municipio | null> => {
    return prisma.municipio.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
    });
  },

  findComunidadesByMunicipio: (municipioId: number) => {
    return prisma.comunidad.findMany({
      where:   { municipioId, status: 'ACTIVO' },
      select:  { id: true, nombre: true, slug: true, irsuActual: true, color: true },
      orderBy: { nombre: 'asc' },
    });
  },
};