import { AppError } from '../lib/app-error';
import { perfilRepository } from './perfil.repository';
import type { ActualizarPerfilDto, AgregarComunidadDto } from './perfil.types';

export const perfilService = {
  async getMiPerfil(usuarioId: number) {
    const usuario = await perfilRepository.findById(usuarioId);
    if (!usuario) throw new AppError(404, 'Usuario no encontrado');

    // Cast to any[] while UsuarioComunidad isn't in the generated Prisma client yet.
    // Once you run `prisma migrate dev` + `prisma generate` this cast can be removed.
    const comunidades = (usuario.comunidades as any[]).map((uc) => ({
      id:           uc.id,
      comunidadId:  uc.comunidadId,
      nombre:       uc.comunidad.nombre,
      slug:         uc.comunidad.slug,
      esPrincipal:  uc.esPrincipal,
      irsuActual:   uc.comunidad.irsuActual,
      color:        uc.comunidad.color,
      codigoPostal: uc.comunidad.codigoPostal?.codigo ?? null,
      colonia:      uc.comunidad.codigoPostal?.colonia ?? null,
    }));

    return {
      id:        usuario.id,
      email:     usuario.email,
      nombre:    usuario.nombre,
      avatarUrl: (usuario as any).avatarUrl ?? null,
      rol:       usuario.rol,
      comunidades,
    };
  },

  async actualizarPerfil(usuarioId: number, dto: ActualizarPerfilDto) {
    if (!dto.nombre) throw new AppError(400, 'Nada que actualizar');
    return perfilRepository.actualizarNombre(usuarioId, dto.nombre);
  },

  async actualizarAvatar(usuarioId: number, file: Express.Multer.File | undefined) {
    if (!file) throw new AppError(400, 'No se recibió ningún archivo');
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await perfilRepository.actualizarAvatar(usuarioId, avatarUrl);
    return { avatarUrl };
  },

  async getMisComunidades(usuarioId: number) {
    const perfil = await perfilRepository.findById(usuarioId);
    if (!perfil) throw new AppError(404, 'Usuario no encontrado');
    return perfil.comunidades;
  },

  async agregarComunidad(usuarioId: number, dto: AgregarComunidadDto) {
    const existe = await perfilRepository.findComunidad(usuarioId, dto.comunidadId);
    if (existe) throw new AppError(409, 'Ya perteneces a esa comunidad');
    const total = await perfilRepository.contarComunidades(usuarioId);
    return perfilRepository.agregarComunidad(usuarioId, dto.comunidadId, total === 0);
  },

  async eliminarComunidad(usuarioId: number, comunidadId: number) {
    const existe = await perfilRepository.findComunidad(usuarioId, comunidadId);
    if (!existe) throw new AppError(404, 'No perteneces a esa comunidad');
    if (existe.esPrincipal) throw new AppError(400, 'No puedes eliminar tu comunidad principal');
    return perfilRepository.eliminarComunidad(usuarioId, comunidadId);
  },

  async setPrincipal(usuarioId: number, comunidadId: number) {
    const existe = await perfilRepository.findComunidad(usuarioId, comunidadId);
    if (!existe) throw new AppError(404, 'No perteneces a esa comunidad');
    return perfilRepository.setPrincipal(usuarioId, comunidadId);
  },
};