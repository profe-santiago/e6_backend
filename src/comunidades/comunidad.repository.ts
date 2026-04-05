import { prisma } from '../lib/prisma';
import { EstadoComunidad } from '@prisma/client';
import { CreateComunidadDto, UpdateComunidadDto, ComunidadResumen, ComunidadDetalle } from './comunidad.types';

const selectResumen = {
  id:         true,
  nombre:     true,
  slug:       true,
  status:     true,
  irsuActual: true,
  color:      true,
  logoUrl:    true,
  municipio:  { select: { id: true, nombre: true } },
} as const;

const selectDetalle = {
  ...selectResumen,
  codigoPostal: { select: { id: true, codigo: true, colonia: true } },
  createdAt:    true,
  updatedAt:    true,
} as const;

export const comunidadRepository = {
  findAll: (filtros: {
    municipioId?: number;
    status?:      EstadoComunidad;
    skip:         number;
    take:         number;
  }): Promise<ComunidadResumen[]> => {
    return prisma.comunidad.findMany({
      where: {
        ...(filtros.municipioId && { municipioId: filtros.municipioId }),
        ...(filtros.status      && { status: filtros.status }),
      },
      select:  selectResumen,
      orderBy: { nombre: 'asc' },
      skip:    filtros.skip,
      take:    filtros.take,
    });
  },

  count: (filtros: { municipioId?: number; status?: EstadoComunidad }): Promise<number> => {
    return prisma.comunidad.count({
      where: {
        ...(filtros.municipioId && { municipioId: filtros.municipioId }),
        ...(filtros.status      && { status: filtros.status }),
      },
    });
  },

  findBySlug: (slug: string): Promise<ComunidadDetalle | null> => {
    return prisma.comunidad.findUnique({
      where:  { slug },
      select: selectDetalle,
    });
  },

  findByNombreYMunicipio: (nombre: string, municipioId: number) => {
    return prisma.comunidad.findUnique({
      where: { municipioId_nombre: { municipioId, nombre } },
    });
  },

  create: (data: CreateComunidadDto & { slug: string }): Promise<ComunidadDetalle> => {
    return prisma.comunidad.create({
      data:   data,
      select: selectDetalle,
    });
  },

  update: (slug: string, data: UpdateComunidadDto): Promise<ComunidadDetalle> => {
    return prisma.comunidad.update({
      where:  { slug },
      data:   data,
      select: selectDetalle,
    });
  },
};