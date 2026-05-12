import { prisma } from '../lib/prisma';

export const perfilRepository = {
  async findById(id: number) {
    return prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        nombre: true,
        avatarUrl: true,
        rol: true,
        comunidades: {
          include: {
            comunidad: {
              include: {
                codigoPostal: {
                  select: { codigo: true, colonia: true },
                },
              },
            },
          },
        },
      },
    });
  },

  async actualizarNombre(id: number, nombre: string) {
    return prisma.usuario.update({
      where: { id: Number(id) },
      data: { nombre },
    });
  },

  async actualizarAvatar(id: number, avatarUrl: string) {
    return prisma.usuario.update({
      where: { id: Number(id) },
      data: { avatarUrl },
    });
  },

  async findComunidad(usuarioId: number, comunidadId: number) {
    return prisma.usuarioComunidad.findUnique({
      where: {
        usuarioId_comunidadId: {
          usuarioId:   Number(usuarioId),
          comunidadId: Number(comunidadId),
        },
      },
    });
  },

  async agregarComunidad(usuarioId: number, comunidadId: number, esPrincipal: boolean) {
    return prisma.usuarioComunidad.create({
      data: {
        usuarioId:   Number(usuarioId),
        comunidadId: Number(comunidadId),
        esPrincipal,
      },
    });
  },

  async eliminarComunidad(usuarioId: number, comunidadId: number) {
    return prisma.usuarioComunidad.delete({
      where: {
        usuarioId_comunidadId: {
          usuarioId:   Number(usuarioId),
          comunidadId: Number(comunidadId),
        },
      },
    });
  },

  async contarComunidades(usuarioId: number) {
    return prisma.usuarioComunidad.count({
      where: { usuarioId: Number(usuarioId) },
    });
  },

  async setPrincipal(usuarioId: number, comunidadId: number) {
    await prisma.usuarioComunidad.updateMany({
      where: { usuarioId: Number(usuarioId) },
      data:  { esPrincipal: false },
    });
    return prisma.usuarioComunidad.update({
      where: {
        usuarioId_comunidadId: {
          usuarioId:   Number(usuarioId),
          comunidadId: Number(comunidadId),
        },
      },
      data: { esPrincipal: true },
    });
  },
};