import { prisma } from '../lib/prisma';
import { votoRepository } from './voto.repository';
import { JwtPayload } from '../auth/auth.types';
import { VotoResumen } from './voto.types';

async function getReporteOr404(reporteId: number) {
  const reporte = await prisma.reporte.findFirst({
    where:  { id: reporteId, deletedAt: null },
    select: { id: true, voteCount: true },
  });
  if (!reporte) {
    throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
  }
  return reporte;
}

export const votoService = {
  getByReporte: async (reporteId: number, user?: JwtPayload): Promise<VotoResumen> => {
    await getReporteOr404(reporteId);

    const votos = await votoRepository.findByReporte(reporteId);
    const yaVote = user
      ? votos.some((v) => v.usuarioId === user.sub)
      : false;

    return {
      total:    votos.length,
      yaVote,
      usuarios: votos.map((v) => v.usuario),
    };
  },

  votar: async (reporteId: number, user: JwtPayload) => {
    await getReporteOr404(reporteId);

    const existente = await votoRepository.findOne(reporteId, user.sub);
    if (existente) {
      throw Object.assign(
        new Error('Ya votaste por este reporte'),
        { statusCode: 400 }
      );
    }

    await votoRepository.add(reporteId, user.sub);
    return { message: 'Voto registrado' };
  },

  quitarVoto: async (reporteId: number, user: JwtPayload) => {
    await getReporteOr404(reporteId);

    const existente = await votoRepository.findOne(reporteId, user.sub);
    if (!existente) {
      throw Object.assign(
        new Error('No has votado por este reporte'),
        { statusCode: 400 }
      );
    }

    await votoRepository.remove(reporteId, user.sub);
    return { message: 'Voto eliminado' };
  },
};