// @ts-nocheck
import { AppError } from '../lib/app-error';
import { perfilRepository } from './perfil.repository';
import type { ActualizarPerfilDto, AgregarComunidadDto } from './perfil.types';

export const perfilService = {
  async getMiPerfil(usuarioId: number | string) {
    const usuario = await perfilRepository.findById(usuarioId);
    if (!usuario) throw new AppError('Usuario no encontrado', 404);
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      avatarUrl: usuario.avatarUrl,
      rol: usuario.rol,
      comunidades: usuario.comunidades.map((uc: any) => ({
        id: uc.id,
        comunidadId: uc.comunidadId,
        nombre: uc.comunidad.nombre,
        slug: uc.comunidad.slug,
        esPrincipal: uc.esPrincipal,
        irsuActual: uc.comunidad.irsuActual,
        color: uc.comunidad.color,
        codigoPostal: uc.comunidad.codigoPostal?.codigo ?? null,
        colonia: uc.comunidad.codigoPostal?.colonia ?? null,
      })),
    };
  },

  async actualizarPerfil(usuarioId: number | string, dto: ActualizarPerfilDto) {
    if (!dto.nombre) throw new AppError('Nada que actualizar', 400);
    return perfilRepository.actualizarNombre(usuarioId, dto.nombre);
  },

  async actualizarAvatar(usuarioId: number | string, file: any) {
    if (!file) throw new AppError('No se recibió ningún archivo', 400);
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await perfilRepository.actualizarAvatar(usuarioId, avatarUrl);
    return { avatarUrl };
  },

  async getMisComunidades(usuarioId: number | string) {
    const perfil = await perfilRepository.findById(usuarioId);
    if (!perfil) throw new AppError('Usuario no encontrado', 404);
    return perfil.comunidades;
  },

  async agregarComunidad(usuarioId: number | string, dto: AgregarComunidadDto) {
    const existe = await perfilRepository.findComunidad(usuarioId, dto.comunidadId);
    if (existe) throw new AppError('Ya perteneces a esa comunidad', 409);
    const total = await perfilRepository.contarComunidades(usuarioId);
    return perfilRepository.agregarComunidad(usuarioId, dto.comunidadId, total === 0);
  },

  async eliminarComunidad(usuarioId: number | string, comunidadId: number) {
    const existe = await perfilRepository.findComunidad(usuarioId, comunidadId);
    if (!existe) throw new AppError('No perteneces a esa comunidad', 404);
    if (existe.esPrincipal) throw new AppError('No puedes eliminar tu comunidad principal', 400);
    return perfilRepository.eliminarComunidad(usuarioId, comunidadId);
  },

  async setPrincipal(usuarioId: number | string, comunidadId: number) {
    const existe = await perfilRepository.findComunidad(usuarioId, comunidadId);
    if (!existe) throw new AppError('No perteneces a esa comunidad', 404);
    return perfilRepository.setPrincipal(usuarioId, comunidadId);
  },
};