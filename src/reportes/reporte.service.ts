import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { reporteRepository } from './reporte.repository';
import {
  CreateReporteInput,
  UpdateReporteInput,
  CambiarEstadoInput,
  FiltrosReporteInput,
} from './reporte.schema';
import { JwtPayload } from '../auth/auth.types';

// Configurable desde .env — si no está definida, usa 3 como valor por defecto
const LIMITE_ANONIMO = Number(process.env.LIMITE_REPORTES_ANONIMO ?? 3);

export const reporteService = {
  getAll: async (filtros: FiltrosReporteInput, user?: JwtPayload) => {
    // COORDINADOR solo ve reportes de su comunidad
    const comunidadId =
      user?.rol === 'COORDINADOR' ? user.comunidadId ?? filtros.comunidadId :
      filtros.comunidadId;

    // USUARIO solo ve sus propios reportes
    const usuarioId =
      user?.rol === 'USUARIO' ? user.sub :
      filtros.usuarioId;

    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    const [reportes, total] = await Promise.all([
      reporteRepository.findAll({
        comunidadId,
        categoria: filtros.categoria,
        estado:    filtros.estado,
        fuente:    filtros.fuente,
        usuarioId,
        skip,
        take,
      }),
      reporteRepository.count({
        comunidadId,
        categoria: filtros.categoria,
        estado:    filtros.estado,
        fuente:    filtros.fuente,
        usuarioId,
      }),
    ]);

    return {
      data: reportes,
      meta: {
        total,
        page:       filtros.page,
        limit:      filtros.limit,
        totalPages: Math.ceil(total / filtros.limit),
      },
    };
  },

  getById: async (id: number) => {
    const reporte = await reporteRepository.findById(id);
    if (!reporte) {
      throw new AppError(404, 'Reporte no encontrado');
    }
    return reporte;
  },

  create: async (data: CreateReporteInput, user?: JwtPayload, ip?: string) => {
    // Valida que la comunidad exista
    const comunidad = await prisma.comunidad.findUnique({
      where:  { id: data.comunidadId },
      select: { id: true, status: true },
    });
    if (!comunidad) {
      throw new AppError(404, 'Comunidad no encontrada');
    }
    if (comunidad.status !== 'ACTIVO') {
      throw new AppError(400, 'Solo se pueden crear reportes en comunidades activas');
    }

    // RF-01-3: Límite para anónimos
    if (!user && ip) {
      const countHoy = await reporteRepository.countByIpToday(ip);
      if (countHoy >= LIMITE_ANONIMO) {
        throw new AppError(
          429,
          `Los usuarios anónimos tienen un límite de ${LIMITE_ANONIMO} reportes por día`
        );
      }
    }

    return reporteRepository.create({
      ...data,
      usuarioId: user?.sub,
      deviceIp:  ip,
    });
  },

  update: async (id: number, data: UpdateReporteInput, user: JwtPayload) => {
    const reporte = await reporteService.getById(id);

    // Solo el autor puede editar
    if (reporte.usuario?.id !== user.sub && user.rol === 'USUARIO') {
      throw new AppError(403, 'Solo puedes editar tus propios reportes');
    }

    // No se puede editar si ya está resuelto o rechazado
    if (['RESUELTO', 'RECHAZADO'].includes(reporte.estado)) {
      throw new AppError(400, 'No se puede editar un reporte resuelto o rechazado');
    }

    return reporteRepository.update(id, data);
  },

  delete: async (id: number, user: JwtPayload) => {
    const reporte = await reporteService.getById(id);

    // Solo el autor puede eliminar
    if (reporte.usuario?.id !== user.sub && user.rol === 'USUARIO') {
      throw new AppError(403, 'Solo puedes eliminar tus propios reportes');
    }

    await reporteRepository.softDelete(id);
    return { message: 'Reporte eliminado correctamente' };
  },

  cambiarEstado: async (id: number, data: CambiarEstadoInput, user: JwtPayload) => {
    const reporte = await reporteService.getById(id);

    // Solo autoridades pueden cambiar estado
    if (user.rol === 'USUARIO') {
      throw new AppError(403, 'No tienes permisos para cambiar el estado de un reporte');
    }

    // COORDINADOR solo puede cambiar estado en su comunidad
    if (user.rol === 'COORDINADOR' && user.comunidadId !== reporte.comunidad.id) {
      throw new AppError(403, 'No puedes cambiar el estado de reportes fuera de tu comunidad');
    }

    await reporteRepository.cambiarEstado(id, {
      estado:         data.estado,
      cambiadoPor:    user.sub,
      estadoAnterior: reporte.estado,
      nota:           data.nota,
    });

    return reporteService.getById(id);
  },
};