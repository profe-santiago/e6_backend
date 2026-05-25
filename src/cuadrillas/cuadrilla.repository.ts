import { prisma } from '../lib/prisma';
import { CreateCuadrillaDto, UpdateCuadrillaDto } from './cuadrilla.types';

const selectCuadrillaResumen = {
  id:          true,
  nombre:      true,
  descripcion: true,
  activa:      true,
  createdAt:   true,
  municipio:   { select: { id: true, nombre: true } },
  _count:      { select: { asignaciones: true } },
} as const;

const selectAsignacionResumen = {
  id:           true,
  estado:       true,
  nota:         true,
  asignadoEn:   true,
  iniciadaEn:   true,
  completadaEn: true,
  cuadrilla:    { select: { id: true, nombre: true } },
  reporte: {
    select: {
      id:       true,
      titulo:   true,
      gravedad: true,
      categoria: true,
      comunidad: { select: { nombre: true } },
    },
  },
  usuario: { select: { id: true, nombre: true, email: true } },
} as const;

export const cuadrillaRepository = {
  // ─── Cuadrillas ──────────────────────────────────────────────────────────

  findAll: (filtros: {
    municipioId?: number;
    activa?:      boolean;
    skip:         number;
    take:         number;
  }) => {
    return prisma.cuadrilla.findMany({
      where: {
        ...(filtros.municipioId !== undefined && { municipioId: filtros.municipioId }),
        ...(filtros.activa      !== undefined && { activa:      filtros.activa }),
      },
      select:  selectCuadrillaResumen,
      orderBy: { nombre: 'asc' },
      skip:    filtros.skip,
      take:    filtros.take,
    });
  },

  count: (filtros: { municipioId?: number; activa?: boolean }) => {
    return prisma.cuadrilla.count({
      where: {
        ...(filtros.municipioId !== undefined && { municipioId: filtros.municipioId }),
        ...(filtros.activa      !== undefined && { activa:      filtros.activa }),
      },
    });
  },

  findById: (id: number) => {
    return prisma.cuadrilla.findUnique({
      where:  { id },
      select: selectCuadrillaResumen,
    });
  },

  create: (data: CreateCuadrillaDto) => {
    return prisma.cuadrilla.create({
      data,
      select: selectCuadrillaResumen,
    });
  },

  update: (id: number, data: UpdateCuadrillaDto) => {
    return prisma.cuadrilla.update({
      where:  { id },
      data,
      select: selectCuadrillaResumen,
    });
  },

  // Cuadrillas activas de un municipio para sugerencias
  findActivas: (municipioId: number) => {
    return prisma.cuadrilla.findMany({
      where:  { municipioId, activa: true },
      select: {
        id:     true,
        nombre: true,
        _count: { select: { asignaciones: { where: { estado: { in: ['ASIGNADA', 'EN_CURSO'] } } } } },
      },
      orderBy: { nombre: 'asc' },
    });
  },

  // ─── Asignaciones ────────────────────────────────────────────────────────

  findAsignaciones: (filtros: {
    cuadrillaId?: number;
    estado?:      string;
    skip:         number;
    take:         number;
  }) => {
    return prisma.asignacionCuadrilla.findMany({
      where: {
        ...(filtros.cuadrillaId && { cuadrillaId: filtros.cuadrillaId }),
        ...(filtros.estado      && { estado:      filtros.estado as any }),
      },
      select:  selectAsignacionResumen,
      orderBy: { asignadoEn: 'desc' },
      skip:    filtros.skip,
      take:    filtros.take,
    });
  },

  countAsignaciones: (filtros: { cuadrillaId?: number; estado?: string }) => {
    return prisma.asignacionCuadrilla.count({
      where: {
        ...(filtros.cuadrillaId && { cuadrillaId: filtros.cuadrillaId }),
        ...(filtros.estado      && { estado:      filtros.estado as any }),
      },
    });
  },

  findAsignacionById: (id: number) => {
    return prisma.asignacionCuadrilla.findUnique({
      where:  { id },
      select: selectAsignacionResumen,
    });
  },

  // Verifica si ya existe asignación activa para ese reporte
  findAsignacionActivaDeReporte: (reporteId: number) => {
    return prisma.asignacionCuadrilla.findFirst({
      where: {
        reporteId,
        estado: { in: ['ASIGNADA', 'EN_CURSO'] },
      },
    });
  },

  crearAsignacion: (data: {
    cuadrillaId: number;
    reporteId:   number;
    asignadoPor: number;
    nota?:       string;
  }) => {
    return prisma.asignacionCuadrilla.create({
      data,
      select: selectAsignacionResumen,
    });
  },

  actualizarEstadoAsignacion: (id: number, data: {
    estado:       string;
    nota?:        string;
    iniciadaEn?:  Date;
    completadaEn?: Date;
  }) => {
    return prisma.asignacionCuadrilla.update({
      where:  { id },
      data:   data as any,
      select: selectAsignacionResumen,
    });
  },
};