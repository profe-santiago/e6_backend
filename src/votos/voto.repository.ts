import { prisma } from '../lib/prisma';

export const votoRepository = {
  findByReporte: (reporteId: number) => {
    return prisma.voto.findMany({
      where:  { reporteId },
      select: {
        id:       true,
        usuarioId: true,
        reporteId: true,
        usuario:  { select: { id: true, nombre: true, email: true } },
      },
      orderBy: { id: 'asc' },
    });
  },

  findOne: (reporteId: number, usuarioId: number) => {
    return prisma.voto.findUnique({
      where: { usuarioId_reporteId: { usuarioId, reporteId } },
    });
  },

  add: (reporteId: number, usuarioId: number) => {
    return prisma.$transaction([
      prisma.voto.create({ data: { reporteId, usuarioId } }),
      prisma.reporte.update({
        where: { id: reporteId },
        data:  { voteCount: { increment: 1 } },
      }),
    ]);
  },

  remove: (reporteId: number, usuarioId: number) => {
    return prisma.$transaction([
      prisma.voto.delete({
        where: { usuarioId_reporteId: { usuarioId, reporteId } },
      }),
      prisma.reporte.update({
        where: { id: reporteId },
        data:  { voteCount: { decrement: 1 } },
      }),
    ]);
  },

  count: (reporteId: number): Promise<number> => {
    return prisma.voto.count({ where: { reporteId } });
  },
};