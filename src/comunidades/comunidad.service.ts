import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { comunidadRepository } from './comunidad.repository';
import { CreateComunidadInput, UpdateComunidadInput, FiltrosComunidadInput } from './comunidad.schema';
import { TokenPayload } from '../auth/auth.types';

function generarSlug(nombre: string, municipioId: number): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base}-${municipioId}-${Date.now().toString(36)}`;
}

export const comunidadService = {
  getAll: async (filtros: FiltrosComunidadInput, user?: TokenPayload) => {
    const municipioId =
      user?.rol === 'ADMIN'        ? user.municipioId ?? filtros.municipioId :
      user?.rol === 'COORDINADOR'  ? user.municipioId ?? filtros.municipioId :
      filtros.municipioId;

    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit; 

    const [comunidades, total] = await Promise.all([
      comunidadRepository.findAll({ municipioId, status: filtros.status, skip, take }),
      comunidadRepository.count({ municipioId, status: filtros.status }),
    ]);

    return {
      data: comunidades,
      meta: {
        total,
        page:       filtros.page,
        limit:      filtros.limit,
        totalPages: Math.ceil(total / filtros.limit),
      },
    };
  },

  getBySlug: async (slug: string) => {
    const comunidad = await comunidadRepository.findBySlug(slug);
    if (!comunidad) {
      throw new AppError(404, 'Comunidad no encontrada');
    }
    return comunidad;
  },

  create: async (data: CreateComunidadInput, user: TokenPayload) => {
    if (user.rol === 'ADMIN' && user.municipioId !== data.municipioId) {
      throw new AppError(403, 'No puedes crear comunidades fuera de tu municipio');
    }

    const municipio = await prisma.municipio.findUnique({ where: { id: data.municipioId } });
    if (!municipio) {
      throw new AppError(404, 'Municipio no encontrado');
    }

    const duplicado = await comunidadRepository.findByNombreYMunicipio(data.nombre, data.municipioId);
    if (duplicado) {
      throw new AppError(400, 'Ya existe una comunidad con ese nombre en este municipio');
    }

    if (data.cpId) {
      const cp = await prisma.codigoPostal.findUnique({ where: { id: data.cpId } });
      if (!cp) {
        throw new AppError(404, 'Código postal no encontrado');
      }
      if (cp.municipioId !== data.municipioId) {
        throw new AppError(400, 'El código postal no pertenece al municipio indicado');
      }
    }

    const slug = generarSlug(data.nombre, data.municipioId);
    return comunidadRepository.create({ ...data, slug });
  },

  update: async (slug: string, data: UpdateComunidadInput, user: TokenPayload) => {
    const comunidad = await comunidadService.getBySlug(slug);

    if (user.rol === 'ADMIN' && user.municipioId !== comunidad.municipio.id) {
      throw new AppError(403, 'No puedes editar comunidades fuera de tu municipio');
    }

    if (data.cpId) {
      const cp = await prisma.codigoPostal.findUnique({ where: { id: data.cpId } });
      if (!cp) {
        throw new AppError(404, 'Código postal no encontrado');
      }
      if (cp.municipioId !== comunidad.municipio.id) {
        throw new AppError(400, 'El código postal no pertenece al municipio de esta comunidad');
      }
    }

    return comunidadRepository.update(slug, data);
  },
};