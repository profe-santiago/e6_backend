import { prisma } from '../lib/prisma';

export async function getRankingUsuarios(limit: number) {
  const rows = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      avatarUrl: true,
      _count: {
        select: { reportes: true },
      },
    },
    orderBy: {
      reportes: { _count: 'desc' },
    },
    take: limit,
  });

  return rows.map((u, index) => ({
    posicion: index + 1,
    id: u.id,
    nombre: u.nombre,
    avatarUrl: u.avatarUrl,
    totalReportes: u._count.reportes,  // aquí aplanamos el objeto anidado
  }));
}