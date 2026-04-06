import { prisma } from '../lib/prisma';
import { Categoria, EstadoReporte, FuenteReporte } from '@prisma/client';
import { CreateReporteDto, ReporteResumen, ReporteDetalle } from './reporte.types';

const selectResumen = {
  id:          true,
  titulo:      true,
  gravedad:    true,
  categoria:   true,
  estado:      true,
  fuente:      true,
  latitud:     true,
  longitud:    true,
  voteCount:   true,
  createdAt:   true,
  comunidad:   { select: { id: true, nombre: true, slug: true } },
  usuario:     { select: { id: true, nombre: true, email: true } },
  fotos:       { select: { id: true, url: true } },
} as const;

const selectDetalle = {
  ...selectResumen,
  descripcion:  true,
  sincronizado: true,
  historial: {
    select: {
      id:             true,
      estadoAnterior: true,
      estadoNuevo:    true,
      nota:           true,
      createdAt:      true,
      usuario:        { select: { id: true, nombre: true, email: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

export const reporteRepository = {
  findAll: (filtros: {
    comunidadId?: number;
    categoria?:   Categoria;
    estado?:      EstadoReporte;
    fuente?:      FuenteReporte;
    usuarioId?:   number;
    skip:         number;
    take:         number;
  }): Promise<ReporteResumen[]> => {
    return prisma.reporte.findMany({
      where: {
        deletedAt: null,
        ...(filtros.comunidadId && { comunidadId: filtros.comunidadId }),
        ...(filtros.categoria   && { categoria:   filtros.categoria }),
        ...(filtros.estado      && { estado:      filtros.estado }),
        ...(filtros.fuente      && { fuente:      filtros.fuente }),
        ...(filtros.usuarioId   && { usuarioId:   filtros.usuarioId }),
      },
      select:  selectResumen,
      orderBy: { createdAt: 'desc' },
      skip:    filtros.skip,
      take:    filtros.take,
    });
  },

  count: (filtros: {
    comunidadId?: number;
    categoria?:   Categoria;
    estado?:      EstadoReporte;
    fuente?:      FuenteReporte;
    usuarioId?:   number;
  }): Promise<number> => {
    return prisma.reporte.count({
      where: {
        deletedAt: null,
        ...(filtros.comunidadId && { comunidadId: filtros.comunidadId }),
        ...(filtros.categoria   && { categoria:   filtros.categoria }),
        ...(filtros.estado      && { estado:      filtros.estado }),
        ...(filtros.fuente      && { fuente:      filtros.fuente }),
        ...(filtros.usuarioId   && { usuarioId:   filtros.usuarioId }),
      },
    });
  },

  findById: (id: number): Promise<ReporteDetalle | null> => {
    return prisma.reporte.findFirst({
      where:  { id, deletedAt: null },
      select: selectDetalle,
    });
  },

  // RF-01-3: Cuenta reportes anónimos del día por IP
  countByIpToday: (ip: string): Promise<number> => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return prisma.reporte.count({
      where: {
        deviceIp:  ip,
        usuarioId: null,
        deletedAt: null,
        createdAt: { gte: hoy },
      },
    });
  },

  create: (data: CreateReporteDto) => {
    const { fotos, ...rest } = data;
    return prisma.reporte.create({
      data: {
        ...rest,
        fotos: fotos?.length
          ? { create: fotos.map((url) => ({ url })) }
          : undefined,
      },
      select: selectDetalle,
    });
  },

  update: (id: number, data: {
    titulo?:      string;
    descripcion?: string;
    gravedad?:    number;
    categoria?:   Categoria;
    fotos?:       string[];
  }) => {
    const { fotos, ...rest } = data;
    return prisma.reporte.update({
      where: { id },
      data: {
        ...rest,
        // Si se actualizan fotos: borra las viejas y crea las nuevas
        ...(fotos !== undefined && {
          fotos: {
            deleteMany: {},
            create: fotos.map((url) => ({ url })),
          },
        }),
      },
      select: selectDetalle,
    });
  },

  softDelete: (id: number) => {
    return prisma.reporte.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
  },

  cambiarEstado: (id: number, data: {
    estado:        EstadoReporte;
    cambiadoPor:   number;
    estadoAnterior: EstadoReporte;
    nota?:         string;
  }) => {
    return prisma.$transaction([
      prisma.reporte.update({
        where: { id },
        data:  { estado: data.estado },
      }),
      prisma.reporteHistorial.create({
        data: {
          reporteId:      id,
          cambiadoPor:    data.cambiadoPor,
          estadoAnterior: data.estadoAnterior,
          estadoNuevo:    data.estado,
          nota:           data.nota,
        },
      }),
    ]);
  },
};