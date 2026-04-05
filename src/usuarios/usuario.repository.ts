import { prisma } from '../lib/prisma';
import { Rol } from '@prisma/client';
import { UsuarioResumen } from './usuario.types';

const selectResumen = {
  id:        true,
  email:     true,
  nombre:    true,
  rol:       true,
  activo:    true,
  createdAt: true,
  municipio: { select: { id: true, nombre: true } },
  comunidad: { select: { id: true, nombre: true, slug: true } },
} as const;

export const usuarioRepository = {
  findAll: (filtros: {
    rol?:         Rol;
    activo?:      boolean;
    municipioId?: number;
    comunidadId?: number;
    skip:         number;
    take:         number;
  }): Promise<UsuarioResumen[]> => {
    return prisma.usuario.findMany({
      where: {
        ...(filtros.rol         && { rol: filtros.rol }),
        ...(filtros.activo      !== undefined && { activo: filtros.activo }),
        ...(filtros.municipioId && { municipioId: filtros.municipioId }),
        ...(filtros.comunidadId && { comunidadId: filtros.comunidadId }),
      },
      select:  selectResumen,
      orderBy: { createdAt: 'desc' },
      skip:    filtros.skip,
      take:    filtros.take,
    });
  },

  count: (filtros: {
    rol?:         Rol;
    activo?:      boolean;
    municipioId?: number;
    comunidadId?: number;
  }): Promise<number> => {
    return prisma.usuario.count({
      where: {
        ...(filtros.rol         && { rol: filtros.rol }),
        ...(filtros.activo      !== undefined && { activo: filtros.activo }),
        ...(filtros.municipioId && { municipioId: filtros.municipioId }),
        ...(filtros.comunidadId && { comunidadId: filtros.comunidadId }),
      },
    });
  },

  findById: (id: number): Promise<UsuarioResumen | null> => {
    return prisma.usuario.findUnique({
      where:  { id },
      select: selectResumen,
    });
  },

  findByEmail: (email: string) => {
    return prisma.usuario.findUnique({ where: { email } });
  },

  create: (data: {
    email:        string;
    passwordHash: string;
    nombre?:      string;
    rol:          Rol;
    municipioId?: number;
    comunidadId?: number;
  }): Promise<UsuarioResumen> => {
    return prisma.usuario.create({
      data,
      select: selectResumen,
    });
  },

  setActivo: (id: number, activo: boolean): Promise<UsuarioResumen> => {
    return prisma.usuario.update({
      where:  { id },
      data:   { activo },
      select: selectResumen,
    });
  },
};