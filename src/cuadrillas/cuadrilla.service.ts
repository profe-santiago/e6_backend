import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { cuadrillaRepository } from './cuadrilla.repository';
import {
  CreateCuadrillaInput,
  UpdateCuadrillaInput,
  AsignarCuadrillaInput,
  CambiarEstadoAsignacionInput,
  FiltrosCuadrillaInput,
  FiltrosAsignacionInput,
} from './cuadrilla.schema';
import { TokenPayload } from '../auth/auth.types';

export const cuadrillaService = {
  // ─── Cuadrillas ──────────────────────────────────────────────────────────

  getAll: async (filtros: FiltrosCuadrillaInput, user: TokenPayload) => {
    // ADMIN solo ve su municipio
    const municipioId =
      user.rol === 'ADMIN' ? user.municipioId ?? filtros.municipioId :
      filtros.municipioId;

    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    const [cuadrillas, total] = await Promise.all([
      cuadrillaRepository.findAll({ municipioId, activa: filtros.activa, skip, take }),
      cuadrillaRepository.count({ municipioId, activa: filtros.activa }),
    ]);

    return {
      data: cuadrillas,
      meta: { total, page: filtros.page, limit: filtros.limit, totalPages: Math.ceil(total / filtros.limit) },
    };
  },

  getById: async (id: number) => {
    const cuadrilla = await cuadrillaRepository.findById(id);
    if (!cuadrilla) throw new AppError(404, 'Cuadrilla no encontrada');
    return cuadrilla;
  },

  create: async (data: CreateCuadrillaInput, user: TokenPayload) => {
    if (user.rol === 'ADMIN' && user.municipioId !== data.municipioId) {
      throw new AppError(403, 'Solo puedes crear cuadrillas en tu municipio');
    }
    const municipio = await prisma.municipio.findUnique({ where: { id: data.municipioId } });
    if (!municipio) throw new AppError(404, 'Municipio no encontrado');

    return cuadrillaRepository.create(data);
  },

  update: async (id: number, data: UpdateCuadrillaInput, user: TokenPayload) => {
    const cuadrilla = await cuadrillaService.getById(id);
    if (user.rol === 'ADMIN' && user.municipioId !== cuadrilla.municipio.id) {
      throw new AppError(403, 'No puedes editar cuadrillas fuera de tu municipio');
    }
    return cuadrillaRepository.update(id, data);
  },

  // Sugerencia inteligente: cuadrillas ordenadas por carga de trabajo (menos asignaciones activas primero)
  getSugeridas: async (municipioId: number) => {
    const cuadrillas = await cuadrillaRepository.findActivas(municipioId);
    // Ordena por cantidad de asignaciones activas (menor carga = más disponible)
    return cuadrillas
      .sort((a, b) => (a._count?.asignaciones ?? 0) - (b._count?.asignaciones ?? 0))
      .map(c => ({
        id:                 c.id,
        nombre:             c.nombre,
        asignacionesActivas: c._count?.asignaciones ?? 0,
      }));
  },

  // ─── Asignaciones ────────────────────────────────────────────────────────

  getAsignaciones: async (filtros: FiltrosAsignacionInput, user: TokenPayload) => {
    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    const [asignaciones, total] = await Promise.all([
      cuadrillaRepository.findAsignaciones({ ...filtros, skip, take }),
      cuadrillaRepository.countAsignaciones(filtros),
    ]);

    return {
      data: asignaciones,
      meta: { total, page: filtros.page, limit: filtros.limit, totalPages: Math.ceil(total / filtros.limit) },
    };
  },

  asignar: async (data: AsignarCuadrillaInput, user: TokenPayload) => {
    // Verifica que la cuadrilla existe y está activa
    const cuadrilla = await cuadrillaRepository.findById(data.cuadrillaId);
    if (!cuadrilla) throw new AppError(404, 'Cuadrilla no encontrada');
    if (!cuadrilla.activa) throw new AppError(400, 'La cuadrilla no está activa');

    // Verifica que el reporte existe y no está resuelto/rechazado
    const reporte = await prisma.reporte.findFirst({
      where:  { id: data.reporteId, deletedAt: null },
      select: { id: true, estado: true, comunidadId: true, comunidad: { select: { municipioId: true } } },
    });
    if (!reporte) throw new AppError(404, 'Reporte no encontrado');
    if (['RESUELTO', 'RECHAZADO'].includes(reporte.estado)) {
      throw new AppError(400, 'No se puede asignar cuadrilla a un reporte resuelto o rechazado');
    }

    // Verifica permisos de municipio
    if (user.rol === 'ADMIN') {
      if (cuadrilla.municipio.id !== user.municipioId) {
        throw new AppError(403, 'La cuadrilla no pertenece a tu municipio');
      }
    }

    // Verifica si ya hay asignación activa para ese reporte
    const asignacionExistente = await cuadrillaRepository.findAsignacionActivaDeReporte(data.reporteId);
    if (asignacionExistente) {
      throw new AppError(409, 'Este reporte ya tiene una cuadrilla asignada activa. Cancela la asignación anterior primero.');
    }

    // Crea la asignación y cambia estado del reporte a EN_PROCESO si está PENDIENTE
    const [asignacion] = await Promise.all([
      cuadrillaRepository.crearAsignacion({
        cuadrillaId: data.cuadrillaId,
        reporteId:   data.reporteId,
        asignadoPor: user.sub,
        nota:        data.nota,
      }),
      reporte.estado === 'PENDIENTE'
        ? prisma.$transaction([
            prisma.reporte.update({ where: { id: data.reporteId }, data: { estado: 'EN_PROCESO' } }),
            prisma.reporteHistorial.create({
              data: {
                reporteId:      data.reporteId,
                cambiadoPor:    user.sub,
                estadoAnterior: 'PENDIENTE',
                estadoNuevo:    'EN_PROCESO',
                nota:           `Cuadrilla "${cuadrilla.nombre}" asignada`,
              },
            }),
          ])
        : Promise.resolve(),
    ]);

    return asignacion;
  },

  cambiarEstadoAsignacion: async (
    id: number,
    data: CambiarEstadoAsignacionInput,
    user: TokenPayload
  ) => {
    const asignacion = await cuadrillaRepository.findAsignacionById(id);
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada');
    if (asignacion.estado === 'COMPLETADA' || asignacion.estado === 'CANCELADA') {
      throw new AppError(400, 'No se puede modificar una asignación finalizada');
    }

    const extras: Record<string, Date> = {};
    if (data.estado === 'EN_CURSO'   && !asignacion.iniciadaEn)   extras.iniciadaEn  = new Date();
    if (data.estado === 'COMPLETADA' && !asignacion.completadaEn) extras.completadaEn = new Date();

    // Si se completa, marcar reporte como RESUELTO automáticamente
    const result = await cuadrillaRepository.actualizarEstadoAsignacion(id, {
      estado: data.estado,
      nota:   data.nota,
      ...extras,
    });

    if (data.estado === 'COMPLETADA') {
      const reporte = await prisma.reporte.findUnique({
        where:  { id: asignacion.reporte.id },
        select: { estado: true },
      });
      if (reporte && reporte.estado !== 'RESUELTO') {
        await prisma.$transaction([
          prisma.reporte.update({ where: { id: asignacion.reporte.id }, data: { estado: 'RESUELTO' } }),
          prisma.reporteHistorial.create({
            data: {
              reporteId:      asignacion.reporte.id,
              cambiadoPor:    user.sub,
              estadoAnterior: reporte.estado,
              estadoNuevo:    'RESUELTO',
              nota:           `Trabajo completado por cuadrilla "${asignacion.cuadrilla.nombre}"`,
            },
          }),
        ]);
      }
    }

    return result;
  },
};