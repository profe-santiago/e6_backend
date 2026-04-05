import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { usuarioRepository } from './usuario.repository';
import {
  CreateAdminInput,
  CreateCoordinadorInput,
  FiltrosUsuarioInput,
} from './usuario.schema';
import { JwtPayload } from '../auth/auth.types';

export const usuarioService = {
  getAll: async (filtros: FiltrosUsuarioInput, user: JwtPayload) => {
    // Restringe el alcance según el rol
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
      usuarioRepository.findAll({
        rol:  filtros.rol,
        activo: filtros.activo,
        municipioId,
        comunidadId,
        skip,
        take,
      }),
      usuarioRepository.count({
        rol:  filtros.rol,
        activo: filtros.activo,
        municipioId,
        comunidadId,
      }),
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
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }
    return usuario;
  },

  getPerfil: async (userId: number) => {
    return usuarioService.getById(userId);
  },

  createAdmin: async (data: CreateAdminInput, user: JwtPayload) => {
    // Solo SUPER_ADMIN puede crear ADMINs
    if (user.rol !== 'SUPER_ADMIN') {
      throw Object.assign(new Error('Solo el SUPER_ADMIN puede crear administradores'), { statusCode: 403 });
    }

    // Valida que el municipio exista
    const municipio = await prisma.municipio.findUnique({ where: { id: data.municipioId } });
    if (!municipio) {
      throw Object.assign(new Error('Municipio no encontrado'), { statusCode: 404 });
    }

    // Valida email único
    const existing = await usuarioRepository.findByEmail(data.email);
    if (existing) {
      throw Object.assign(new Error('El email ya está registrado'), { statusCode: 400 });
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

  createCoordinador: async (data: CreateCoordinadorInput, user: JwtPayload) => {
    // Valida que la comunidad exista
    const comunidad = await prisma.comunidad.findUnique({
      where:  { id: data.comunidadId },
      select: { id: true, municipioId: true, status: true },
    });
    if (!comunidad) {
      throw Object.assign(new Error('Comunidad no encontrada'), { statusCode: 404 });
    }

    // La comunidad debe estar ACTIVA para tener coordinador
    if (comunidad.status !== 'ACTIVO') {
      throw Object.assign(
        new Error('Solo se puede asignar coordinador a comunidades activas'),
        { statusCode: 400 }
      );
    }

    // ADMIN solo puede crear coordinadores en su municipio
    if (user.rol === 'ADMIN' && user.municipioId !== comunidad.municipioId) {
      throw Object.assign(
        new Error('No puedes crear coordinadores fuera de tu municipio'),
        { statusCode: 403 }
      );
    }

    // Valida email único
    const existing = await usuarioRepository.findByEmail(data.email);
    if (existing) {
      throw Object.assign(new Error('El email ya está registrado'), { statusCode: 400 });
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

  desactivar: async (id: number, user: JwtPayload) => {
    const objetivo = await usuarioService.getById(id);

    // No puede desactivarse a sí mismo
    if (objetivo.id === user.sub) {
      throw Object.assign(new Error('No puedes desactivar tu propia cuenta'), { statusCode: 400 });
    }

    // ADMIN solo puede desactivar usuarios de su municipio
    if (user.rol === 'ADMIN') {
      const municipioObjetivo = objetivo.municipio?.id;
      if (municipioObjetivo !== user.municipioId) {
        throw Object.assign(
          new Error('No puedes desactivar usuarios fuera de tu municipio'),
          { statusCode: 403 }
        );
      }
    }

    // No se puede desactivar a un SUPER_ADMIN
    if (objetivo.rol === 'SUPER_ADMIN') {
      throw Object.assign(new Error('No se puede desactivar a un SUPER_ADMIN'), { statusCode: 403 });
    }

    return usuarioRepository.setActivo(id, false);
  },

  activar: async (id: number, user: JwtPayload) => {
    const objetivo = await usuarioService.getById(id);

    if (user.rol === 'ADMIN') {
      const municipioObjetivo = objetivo.municipio?.id;
      if (municipioObjetivo !== user.municipioId) {
        throw Object.assign(
          new Error('No puedes activar usuarios fuera de tu municipio'),
          { statusCode: 403 }
        );
      }
    }

    return usuarioRepository.setActivo(id, true);
  },
};