import { prisma } from '../lib/prisma';
import { comunidadRepository } from './comunidad.repository';
import { CreateComunidadInput, UpdateComunidadInput, FiltrosComunidadInput } from './comunidad.schema';
import { JwtPayload } from '../auth/auth.types';

// Genera slug a partir del nombre + municipioId + timestamp corto
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
  getAll: async (filtros: FiltrosComunidadInput, user?: JwtPayload) => {
    // ADMIN solo ve su municipio, COORDINADOR solo ve su comunidad (retorna array con una)
    const municipioId =
      user?.rol === 'ADMIN'        ? user.municipioId ?? filtros.municipioId :
      user?.rol === 'COORDINADOR'  ? user.municipioId ?? filtros.municipioId :
      filtros.municipioId;

    const skip  = (filtros.page - 1) * filtros.limit;
    const take  = filtros.limit;

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
      throw Object.assign(new Error('Comunidad no encontrada'), { statusCode: 404 });
    }
    return comunidad;
  },

  create: async (data: CreateComunidadInput, user: JwtPayload) => {
    // ADMIN solo puede crear en su municipio
    if (user.rol === 'ADMIN' && user.municipioId !== data.municipioId) {
      throw Object.assign(
        new Error('No puedes crear comunidades fuera de tu municipio'),
        { statusCode: 403 }
      );
    }

    // Valida que el municipio exista
    const municipio = await prisma.municipio.findUnique({ where: { id: data.municipioId } });
    if (!municipio) {
      throw Object.assign(new Error('Municipio no encontrado'), { statusCode: 404 });
    }

    // Valida duplicado nombre+municipio
    const duplicado = await comunidadRepository.findByNombreYMunicipio(data.nombre, data.municipioId);
    if (duplicado) {
      throw Object.assign(
        new Error('Ya existe una comunidad con ese nombre en este municipio'),
        { statusCode: 400 }
      );
    }

    // Valida CP si se envía
    if (data.cpId) {
      const cp = await prisma.codigoPostal.findUnique({ where: { id: data.cpId } });
      if (!cp) {
        throw Object.assign(new Error('Código postal no encontrado'), { statusCode: 404 });
      }
      if (cp.municipioId !== data.municipioId) {
        throw Object.assign(
          new Error('El código postal no pertenece al municipio indicado'),
          { statusCode: 400 }
        );
      }
    }

    const slug = generarSlug(data.nombre, data.municipioId);
    return comunidadRepository.create({ ...data, slug });
  },

  update: async (slug: string, data: UpdateComunidadInput, user: JwtPayload) => {
    const comunidad = await comunidadService.getBySlug(slug);

    // ADMIN solo puede editar comunidades de su municipio
    if (user.rol === 'ADMIN' && user.municipioId !== comunidad.municipio.id) {
      throw Object.assign(
        new Error('No puedes editar comunidades fuera de tu municipio'),
        { statusCode: 403 }
      );
    }

    // Valida CP si se cambia
    if (data.cpId) {
      const cp = await prisma.codigoPostal.findUnique({ where: { id: data.cpId } });
      if (!cp) {
        throw Object.assign(new Error('Código postal no encontrado'), { statusCode: 404 });
      }
      if (cp.municipioId !== comunidad.municipio.id) {
        throw Object.assign(
          new Error('El código postal no pertenece al municipio de esta comunidad'),
          { statusCode: 400 }
        );
      }
    }

    return comunidadRepository.update(slug, data);
  },
};