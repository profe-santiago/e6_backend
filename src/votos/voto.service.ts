import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { votoRepository } from './voto.repository';
import { TokenPayload } from '../auth/auth.types';
import { VotoResumen } from './voto.types';

async function getReporteOr404(reporteId: number) {
  const reporte = await prisma.reporte.findFirst({
    where:  { id: reporteId, deletedAt: null },
    select: { id: true, voteCount: true },
  });
  if (!reporte) throw new AppError(404, 'Reporte no encontrado');
  return reporte;
}

export const votoService = {
  getByReporte: async (reporteId: number, user?: TokenPayload): Promise<VotoResumen> => {
    await getReporteOr404(reporteId);
    const votos  = await votoRepository.findByReporte(reporteId);
    const yaVote = user ? votos.some((v) => v.usuarioId === user.sub) : false;
    return { total: votos.length, yaVote, usuarios: votos.map((v) => v.usuario) };
  },

  votar: async (reporteId: number, user: TokenPayload) => {
    await getReporteOr404(reporteId);
    const existente = await votoRepository.findOne(reporteId, user.sub);
    if (existente) throw new AppError(400, 'Ya votaste por este reporte');
    await votoRepository.add(reporteId, user.sub);
    return { message: 'Voto registrado' };
  },

  quitarVoto: async (reporteId: number, user: TokenPayload) => {
    await getReporteOr404(reporteId);
    const existente = await votoRepository.findOne(reporteId, user.sub);
    if (!existente) throw new AppError(400, 'No has votado por este reporte');
    await votoRepository.remove(reporteId, user.sub);
    return { message: 'Voto eliminado' };
  },
};