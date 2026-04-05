import { prisma } from '../lib/prisma';
import { reporteRepository } from './reporte.repository';
import {
  CreateReporteInput,
  UpdateReporteInput,
  CambiarEstadoInput,
  FiltrosReporteInput,
} from './reporte.schema';
import { JwtPayload } from '../auth/auth.types';

const LIMITE_ANONIMO = 3; // RF-01-3

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
      throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
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
      throw Object.assign(new Error('Comunidad no encontrada'), { statusCode: 404 });
    }
    if (comunidad.status !== 'ACTIVO') {
      throw Object.assign(
        new Error('Solo se pueden crear reportes en comunidades activas'),
        { statusCode: 400 }
      );
    }

    // RF-01-3: Límite para anónimos
    if (!user && ip) {
      const countHoy = await reporteRepository.countByIpToday(ip);
      if (countHoy >= LIMITE_ANONIMO) {
        throw Object.assign(
          new Error(`Los usuarios anónimos tienen un límite de ${LIMITE_ANONIMO} reportes por día`),
          { statusCode: 429 }
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

    // Solo el autor puede editar (RF-02-2)
    if (reporte.usuario?.id !== user.sub && user.rol === 'USUARIO') {
      throw Object.assign(
        new Error('Solo puedes editar tus propios reportes'),
        { statusCode: 403 }
      );
    }

    // No se puede editar si ya está resuelto o rechazado
    if (['RESUELTO', 'RECHAZADO'].includes(reporte.estado)) {
      throw Object.assign(
        new Error('No se puede editar un reporte resuelto o rechazado'),
        { statusCode: 400 }
      );
    }

    return reporteRepository.update(id, data);
  },

  delete: async (id: number, user: JwtPayload) => {
    const reporte = await reporteService.getById(id);

    // Solo el autor puede eliminar (RF-02-2)
    if (reporte.usuario?.id !== user.sub && user.rol === 'USUARIO') {
      throw Object.assign(
        new Error('Solo puedes eliminar tus propios reportes'),
        { statusCode: 403 }
      );
    }

    await reporteRepository.softDelete(id);
    return { message: 'Reporte eliminado correctamente' };
  },

  cambiarEstado: async (id: number, data: CambiarEstadoInput, user: JwtPayload) => {
    const reporte = await reporteService.getById(id);

    // Solo autoridades pueden cambiar estado (RF-05-7)
    if (user.rol === 'USUARIO') {
      throw Object.assign(
        new Error('No tienes permisos para cambiar el estado de un reporte'),
        { statusCode: 403 }
      );
    }

    // COORDINADOR solo puede cambiar estado en su comunidad
    if (user.rol === 'COORDINADOR' && user.comunidadId !== reporte.comunidad.id) {
      throw Object.assign(
        new Error('No puedes cambiar el estado de reportes fuera de tu comunidad'),
        { statusCode: 403 }
      );
    }

    await reporteRepository.cambiarEstado(id, {
      estado:         data.estado,
      cambiadoPor:    user.sub,
      estadoAnterior: reporte.estado,
      nota:           data.nota,
    });

    return reporteService.getById(id);
  },

  votar: async (id: number, user: JwtPayload) => {
    await reporteService.getById(id);

    const votoExistente = await reporteRepository.findVoto(id, user.sub);
    if (votoExistente) {
      throw Object.assign(
        new Error('Ya votaste por este reporte'),
        { statusCode: 400 }
      );
    }

    await reporteRepository.addVoto(id, user.sub);
    return { message: 'Voto registrado' };
  },

  quitarVoto: async (id: number, user: JwtPayload) => {
    await reporteService.getById(id);

    const votoExistente = await reporteRepository.findVoto(id, user.sub);
    if (!votoExistente) {
      throw Object.assign(
        new Error('No has votado por este reporte'),
        { statusCode: 400 }
      );
    }

    await reporteRepository.removeVoto(id, user.sub);
    return { message: 'Voto eliminado' };
  },
};