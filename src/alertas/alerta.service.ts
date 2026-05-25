import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { alertaRepository } from './alerta.repository';
import {
  FiltrosAlertaInput,
  AsignarAlertaInput,
} from './alerta.schema';
import { CreateAlertaDto } from './alerta.types';
import { TokenPayload } from '../auth/auth.types';
import { Categoria, NivelAlerta } from '@prisma/client';

// Umbrales del IRSU
const UMBRAL_AMARILLA = 50;
const UMBRAL_ROJA     = 100;

export const alertaService = {
  getAll: async (filtros: FiltrosAlertaInput, user: TokenPayload) => {
    // COORDINADOR solo ve alertas de su comunidad
    const comunidadId =
      user.rol === 'COORDINADOR' ? user.comunidadId ?? filtros.comunidadId :
      user.rol === 'ADMIN'       ? filtros.comunidadId :
      filtros.comunidadId;

    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    const [alertas, total] = await Promise.all([
      alertaRepository.findAll({
        comunidadId,
        nivel:     filtros.nivel,
        estado:    filtros.estado,
        categoria: filtros.categoria,
        skip,
        take,
      }),
      alertaRepository.count({
        comunidadId,
        nivel:     filtros.nivel,
        estado:    filtros.estado,
        categoria: filtros.categoria,
      }),
    ]);

    return {
      data: alertas,
      meta: {
        total,
        page:       filtros.page,
        limit:      filtros.limit,
        totalPages: Math.ceil(total / filtros.limit),
      },
    };
  },

  getById: async (id: number) => {
    const alerta = await alertaRepository.findById(id);
    if (!alerta) {
      throw new AppError(404, 'Alerta no encontrada');
    }
    return alerta;
  },

  // Generación automática desde el motor IRSU
  generarSiCorresponde: async (
    comunidadId: number,
    categoria:   Categoria,
    irsuValor:   number
  ) => {
    let nivel: NivelAlerta | null = null;

    if (irsuValor > UMBRAL_ROJA) {
      nivel = 'ROJA';
    } else if (irsuValor > UMBRAL_AMARILLA) {
      nivel = 'AMARILLA';
    }

    if (!nivel) return null;

    const alertaExistente = await alertaRepository.findActiva(comunidadId, categoria);

    if (alertaExistente) {
      if (alertaExistente.nivel === 'AMARILLA' && nivel === 'ROJA') {
        return prisma.alerta.update({
          where: { id: alertaExistente.id },
          data:  { nivel, irsuValor },
        });
      }
      return prisma.alerta.update({
        where: { id: alertaExistente.id },
        data:  { irsuValor },
      });
    }

    const data: CreateAlertaDto = { comunidadId, categoria, nivel, irsuValor };
    return alertaRepository.create(data);
  },

  // Tomar una alerta
  tomar: async (id: number, user: TokenPayload) => {
    const alerta = await alertaService.getById(id);

    if (alerta.estado !== 'ACTIVA') {
      throw new AppError(400, 'Solo se pueden tomar alertas en estado ACTIVA');
    }

    if (user.rol === 'COORDINADOR' && user.comunidadId !== alerta.comunidad.id) {
      throw new AppError(403, 'No puedes tomar alertas fuera de tu comunidad');
    }

    return alertaRepository.tomarAlerta(id, user.sub);
  },

  // Asignar alerta a otro usuario
  asignar: async (id: number, data: AsignarAlertaInput, user: TokenPayload) => {
    const alerta = await alertaService.getById(id);

    if (alerta.estado === 'CERRADA') {
      throw new AppError(400, 'No se puede asignar una alerta cerrada');
    }

    const objetivo = await prisma.usuario.findUnique({
      where:  { id: data.usuarioId },
      select: { id: true, rol: true, activo: true, municipioId: true, comunidadId: true },
    });

    if (!objetivo) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    if (!objetivo.activo) {
      throw new AppError(400, 'No se puede asignar a un usuario inactivo');
    }

    if (!['COORDINADOR', 'ADMIN', 'SUPER_ADMIN'].includes(objetivo.rol)) {
      throw new AppError(400, 'Solo se puede asignar a COORDINADOR, ADMIN o SUPER_ADMIN');
    }

    if (user.rol === 'ADMIN' && objetivo.municipioId !== user.municipioId) {
      throw new AppError(403, 'No puedes asignar alertas a usuarios fuera de tu municipio');
    }

    return alertaRepository.asignar(id, data.usuarioId);
  },

  // Cerrar alerta
  cerrar: async (id: number, user: TokenPayload) => {
    const alerta = await alertaService.getById(id);

    if (alerta.estado === 'CERRADA') {
      throw new AppError(400, 'La alerta ya está cerrada');
    }

    if (alerta.estado === 'ACTIVA') {
      throw new AppError(400, 'Debes tomar la alerta antes de cerrarla');
    }

    if (user.rol === 'COORDINADOR' && user.comunidadId !== alerta.comunidad.id) {
      throw new AppError(403, 'No puedes cerrar alertas fuera de tu comunidad');
    }

    return alertaRepository.cerrar(id);
  },
};