import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { usuarioRepository } from './usuario.repository';
import {
  CreateAdminInput,
  CreateCoordinadorInput,
  CreateOperadorInput,
  FiltrosUsuarioInput,
} from './usuario.schema';
import { TokenPayload } from '../auth/auth.types';

export const usuarioService = {
  getAll: async (filtros: FiltrosUsuarioInput, user: TokenPayload) => {
    const municipioId =
      user.rol === 'ADMIN'       ? user.municipioId :
      user.rol === 'COORDINADOR' ? user.municipioId :
      filtros.municipioId;

    const comunidadId =
      user.rol === 'COORDINADOR' ? user.comunidadId :
      filtros.comunidadId;

    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    const [usuarios, total] = await Promise.all([
      usuarioRepository.findAll({ rol: filtros.rol, activo: filtros.activo, municipioId, comunidadId, skip, take }),
      usuarioRepository.count({ rol: filtros.rol, activo: filtros.activo, municipioId, comunidadId }),
    ]);

    return {
      data: usuarios,
      meta: {
        total,
        page:       filtros.page,
        limit:      filtros.limit,
        totalPages: Math.ceil(total / filtros.limit),
      },
    };
  },

  getById: async (id: number) => {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    return usuario;
  },

  getPerfil: async (userId: number) => {
    return usuarioService.getById(userId);
  },

  createAdmin: async (data: CreateAdminInput, user: TokenPayload) => {
    if (user.rol !== 'SUPER_ADMIN') {
      throw new AppError(403, 'Solo el SUPER_ADMIN puede crear administradores');
    }

    const municipio = await prisma.municipio.findUnique({ where: { id: data.municipioId } });
    if (!municipio) {
      throw new AppError(404, 'Municipio no encontrado');
    }

    const existing = await usuarioRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(400, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    return usuarioRepository.create({
      email: data.email,
      passwordHash,
      nombre:      data.nombre,
      rol:         'ADMIN',
      municipioId: data.municipioId,
    });
  },

  createCoordinador: async (data: CreateCoordinadorInput, user: TokenPayload) => {
    const comunidad = await prisma.comunidad.findUnique({
      where:  { id: data.comunidadId },
      select: { id: true, municipioId: true, status: true },
    });
    if (!comunidad) {
      throw new AppError(404, 'Comunidad no encontrada');
    }

    if (comunidad.status !== 'ACTIVO') {
      throw new AppError(400, 'Solo se puede asignar coordinador a comunidades activas');
    }

    if (user.rol === 'ADMIN' && user.municipioId !== comunidad.municipioId) {
      throw new AppError(403, 'No puedes crear coordinadores fuera de tu municipio');
    }

    const existing = await usuarioRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(400, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    return usuarioRepository.create({
      email: data.email,
      passwordHash,
      nombre:      data.nombre,
      rol:         'COORDINADOR',
      municipioId: comunidad.municipioId,
      comunidadId: data.comunidadId,
    });
  },

  /**
   * Crea un OPERADOR de cuadrilla — solo ADMIN o SUPER_ADMIN
   * El operador solo puede ver y actualizar asignaciones de cuadrilla
   */
  createOperador: async (data: CreateOperadorInput, user: TokenPayload) => {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.rol)) {
      throw new AppError(403, 'Solo ADMIN o SUPER_ADMIN pueden crear operadores');
    }

    if (user.rol === 'ADMIN' && user.municipioId !== data.municipioId) {
      throw new AppError(403, 'No puedes crear operadores fuera de tu municipio');
    }

    const municipio = await prisma.municipio.findUnique({ where: { id: data.municipioId } });
    if (!municipio) {
      throw new AppError(404, 'Municipio no encontrado');
    }

    const existing = await usuarioRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(400, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    return usuarioRepository.create({
      email:       data.email,
      passwordHash,
      nombre:      data.nombre,
      rol:         'OPERADOR',
      municipioId: data.municipioId,
    });
  },

  desactivar: async (id: number, user: TokenPayload) => {
    const objetivo = await usuarioService.getById(id);

    if (objetivo.id === user.sub) {
      throw new AppError(400, 'No puedes desactivar tu propia cuenta');
    }

    if (user.rol === 'ADMIN' && objetivo.municipio?.id !== user.municipioId) {
      throw new AppError(403, 'No puedes desactivar usuarios fuera de tu municipio');
    }

    if (objetivo.rol === 'SUPER_ADMIN') {
      throw new AppError(403, 'No se puede desactivar a un SUPER_ADMIN');
    }

    return usuarioRepository.setActivo(id, false);
  },

  activar: async (id: number, user: TokenPayload) => {
    const objetivo = await usuarioService.getById(id);

    if (user.rol === 'ADMIN' && objetivo.municipio?.id !== user.municipioId) {
      throw new AppError(403, 'No puedes activar usuarios fuera de tu municipio');
    }

    return usuarioRepository.setActivo(id, true);
  },
};